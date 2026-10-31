// Lockstep for Windows: a tray icon that runs the Lockstep server in the
// background, the way Jellyfin's Windows server does. The app itself is the
// unchanged web app, used in the browser at http://localhost:<port> or from
// any device on the home network.
//
// Layout next to this exe (built by scripts/build-windows.mjs):
//   node\node.exe   bundled Node.js
//   app\            the production app (.next, data, scripts, node_modules, ...)
// Data lives in %LOCALAPPDATA%\Lockstep (override: LOCKSTEP_DATA_DIR):
//   nuzlocke.db, custom-games\, settings.json ({"port": 3000}), logs\server.log
//
// Startup: scripts/prepare-runtime.mjs (downloads, migrations, backfill - the
// same steps as docker-entrypoint.sh), then `next start`. Both run inside a
// Windows job object that kills them with this process, so a crash or a
// Task Manager kill never leaves a server holding the port.
//
// Compiled with the C# 5 compiler that ships with .NET Framework 4 (csc.exe),
// so it needs no SDK and no runtime beyond what Windows 10/11 already has.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Lockstep")]
[assembly: AssemblyProduct("Lockstep")]
[assembly: AssemblyDescription("Lockstep - SoulLink & Nuzlocke tracker")]
[assembly: AssemblyCopyright("smiei, MIT License")]
[assembly: AssemblyVersion(LockstepTray.Build.Version)]
[assembly: AssemblyFileVersion(LockstepTray.Build.Version)]

namespace LockstepTray
{
    static partial class Build
    {
        // Replaced by build-windows.mjs (MAJOR.MINOR.0.0).
        public const string Version = "0.0.0.0";
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            bool created;
            using (var mutex = new Mutex(true, "Local\\LockstepTray", out created))
            {
                if (!created)
                {
                    // Already running: open the app - or, while it is still
                    // starting, the waiting page that switches to it by itself.
                    var port = Settings.Load(Tray.DataDir()).Port;
                    var wait = Tray.WaitFile(Tray.DataDir());
                    Tray.OpenUrl(!Tray.Healthy(port) && File.Exists(wait) ? wait : "http://localhost:" + port + "/");
                    return;
                }
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new Tray());
            }
        }
    }

    class Settings
    {
        public int Port = 3000;
        public bool Opened;

        static string FileOf(string dataDir) { return Path.Combine(dataDir, "settings.json"); }

        public static Settings Load(string dataDir)
        {
            var s = new Settings();
            try
            {
                var text = File.ReadAllText(FileOf(dataDir));
                var port = Regex.Match(text, "\"port\"\\s*:\\s*(\\d+)");
                if (port.Success) s.Port = int.Parse(port.Groups[1].Value);
                s.Opened = Regex.IsMatch(text, "\"opened\"\\s*:\\s*true");
            }
            catch (Exception) { }
            return s;
        }

        public void Save(string dataDir)
        {
            File.WriteAllText(FileOf(dataDir),
                "{\n  \"port\": " + Port + ",\n  \"opened\": " + (Opened ? "true" : "false") + "\n}\n");
        }
    }

    class Tray : ApplicationContext
    {
        const string RepoUrl = "https://github.com/smiei/lockstep";
        const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";

        readonly NotifyIcon icon;
        readonly Control ui;
        readonly ToolStripMenuItem openItem, addressItem, autostartItem, updateItem;
        readonly string baseDir, appDir, nodeExe, dataDir, logDir, logFile;
        readonly object logLock = new object();
        readonly Dictionary<string, string> t;
        Settings settings;
        Job job;
        Process server;
        bool quitting, ready;
        int generation, port;
        int waitStep; // 0 images, 1 database, 2 server

        public static string DataDir()
        {
            var custom = Environment.GetEnvironmentVariable("LOCKSTEP_DATA_DIR");
            if (!string.IsNullOrEmpty(custom)) return Path.GetFullPath(custom);
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Lockstep");
        }

        public static string WaitFile(string dataDir) { return Path.Combine(dataDir, "wait.html"); }

        public Tray()
        {
            t = Texts.For(CultureInfo.CurrentUICulture.TwoLetterISOLanguageName);
            baseDir = AppDomain.CurrentDomain.BaseDirectory;
            appDir = Path.Combine(baseDir, "app");
            nodeExe = Path.Combine(baseDir, "node", "node.exe");
            dataDir = DataDir();
            logDir = Path.Combine(dataDir, "logs");
            logFile = Path.Combine(logDir, "server.log");
            Directory.CreateDirectory(logDir);
            settings = Settings.Load(dataDir);

            ui = new Control();
            ui.CreateControl();
            var handle = ui.Handle; // forces the handle so BeginInvoke works from worker threads

            var menu = new ContextMenuStrip();
            openItem = new ToolStripMenuItem(t["open"], null, delegate { OpenApp(); });
            openItem.Font = new Font(openItem.Font, FontStyle.Bold);
            addressItem = new ToolStripMenuItem(t["address"] + " …", null, delegate { CopyAddress(); });
            updateItem = new ToolStripMenuItem("", null, delegate { OpenUrl(RepoUrl + "/releases/latest"); });
            updateItem.Visible = false;
            autostartItem = new ToolStripMenuItem(t["autostart"], null, delegate { ToggleAutostart(); });
            autostartItem.Checked = AutostartEnabled();
            menu.Items.Add(openItem);
            menu.Items.Add(addressItem);
            menu.Items.Add(updateItem);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(new ToolStripMenuItem(t["dataFolder"], null, delegate { OpenUrl(dataDir); }));
            menu.Items.Add(new ToolStripMenuItem(t["log"], null, delegate { if (File.Exists(logFile)) OpenUrl(logFile); }));
            menu.Items.Add(autostartItem);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(new ToolStripMenuItem(t["restart"], null, delegate { Start(); }));
            menu.Items.Add(new ToolStripMenuItem(t["quit"], null, delegate { Quit(); }));

            icon = new NotifyIcon();
            icon.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            icon.ContextMenuStrip = menu;
            icon.DoubleClick += delegate { OpenApp(); };
            icon.Visible = true;

            Start();
            ThreadPool.QueueUserWorkItem(delegate { CheckForUpdate(); });
        }

        // ---- server lifecycle -------------------------------------------------

        void Start()
        {
            StopServer();
            var mine = ++generation;
            ready = false;
            SetStatus(t["starting"], false);
            ThreadPool.QueueUserWorkItem(delegate { Run(mine); });
        }

        void Run(int mine)
        {
            try
            {
                RotateLog();
                var port = settings.Port;
                if (!PortFree(port))
                {
                    var next = port + 1;
                    while (next < port + 50 && !PortFree(next)) next++;
                    Log("Port " + port + " is in use, using " + next + " instead.");
                    port = next;
                    settings.Port = port;
                    settings.Save(dataDir);
                }
                this.port = port;

                // The waiting page: written now, and opened at once on the
                // first start, so nobody stares at a tray icon for minutes.
                waitStep = 0;
                WriteWaitPage(false);
                if (!settings.Opened)
                {
                    Ui(delegate
                    {
                        OpenUrl(WaitFile(dataDir));
                        icon.ShowBalloonTip(8000, "Lockstep", t["trayHint"], ToolTipIcon.Info);
                    });
                }

                job = new Job();
                Log("Lockstep " + Build.Version + " - data: " + dataDir);
                var prepare = Spawn("scripts\\prepare-runtime.mjs", port);
                prepare.WaitForExit();
                if (mine != generation) return;
                if (prepare.ExitCode != 0)
                {
                    WriteWaitPage(true);
                    SetStatus(t["failed"], true);
                    Ui(delegate
                    {
                        if (MessageBox.Show(t["failedText"], "Lockstep", MessageBoxButtons.YesNo, MessageBoxIcon.Error) == DialogResult.Yes)
                            OpenUrl(logFile);
                    });
                    return;
                }

                server = Spawn("node_modules\\next\\dist\\bin\\next start -p " + port + " -H 0.0.0.0", port);
                var watched = server;
                for (var i = 0; i < 240 && mine == generation; i++)
                {
                    if (watched.HasExited) break;
                    if (Healthy(port))
                    {
                        ready = true;
                        Ui(delegate
                        {
                            UpdateAddress();
                            SetStatus(t["running"], false);
                            icon.ShowBalloonTip(4000, "Lockstep", t["runningText"] + " http://localhost:" + port, ToolTipIcon.Info);
                            // The waiting page switches over by itself.
                            if (!settings.Opened)
                            {
                                settings.Opened = true;
                                settings.Save(dataDir);
                            }
                        });
                        break;
                    }
                    Thread.Sleep(500);
                }
                watched.WaitForExit();
                if (mine == generation && !quitting)
                {
                    ready = false;
                    Log("Server stopped (exit " + watched.ExitCode + ").");
                    WriteWaitPage(true);
                    SetStatus(t["stopped"], true);
                }
            }
            catch (Exception e)
            {
                Log("ERROR: " + e);
                WriteWaitPage(true);
                SetStatus(t["failed"], true);
            }
        }

        Process Spawn(string args, int port)
        {
            var psi = new ProcessStartInfo(nodeExe, args);
            psi.WorkingDirectory = appDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            psi.StandardOutputEncoding = Encoding.UTF8;
            psi.StandardErrorEncoding = Encoding.UTF8;
            var env = psi.EnvironmentVariables;
            env["DATABASE_URL"] = "file:" + Path.Combine(dataDir, "nuzlocke.db").Replace('\\', '/');
            env["PORT"] = port.ToString();
            env["NODE_ENV"] = "production";
            env["NEXT_TELEMETRY_DISABLED"] = "1";
            // Prisma looks for its engine where the client was GENERATED (the
            // build machine's folder) and gives up; point it at our copy.
            env["PRISMA_QUERY_ENGINE_LIBRARY"] = Path.Combine(appDir, "src", "generated", "prisma", "query_engine-windows.dll.node");
            env["PATH"] = Path.GetDirectoryName(nodeExe) + ";" + env["PATH"];
            var p = new Process();
            p.StartInfo = psi;
            p.OutputDataReceived += delegate(object s, DataReceivedEventArgs e) { if (e.Data != null) OnOutput(e.Data); };
            p.ErrorDataReceived += delegate(object s, DataReceivedEventArgs e) { if (e.Data != null) Log(e.Data); };
            p.Start();
            job.Add(p);
            p.BeginOutputReadLine();
            p.BeginErrorReadLine();
            return p;
        }

        void StopServer()
        {
            generation++;
            if (job != null) { job.Dispose(); job = null; }
            server = null;
        }

        void Quit()
        {
            quitting = true;
            StopServer();
            icon.Visible = false;
            icon.Dispose();
            ExitThread();
        }

        // ---- menu actions -----------------------------------------------------

        void OpenApp()
        {
            var wait = WaitFile(dataDir);
            OpenUrl(!ready && File.Exists(wait) ? wait : "http://localhost:" + settings.Port + "/");
        }

        // prepare-runtime.mjs announces each step with "== <label>": move the
        // waiting page along with it.
        void OnOutput(string line)
        {
            Log(line);
            if (!line.StartsWith("== ")) return;
            var step = waitStep;
            if (line.StartsWith("== Database")) step = 1;
            else if (line.StartsWith("== Ready")) step = 2;
            if (step != waitStep)
            {
                waitStep = step;
                WriteWaitPage(false);
            }
        }

        // Fills windows/wait.html (next to this exe) and writes it into the data
        // folder; see the page's own comment for how it switches to the app.
        void WriteWaitPage(bool failed)
        {
            try
            {
                var template = Path.Combine(baseDir, "wait.html");
                if (!File.Exists(template)) return;
                string logo = "";
                var logoFile = Path.Combine(appDir, "public", "icons", "logo.svg");
                if (File.Exists(logoFile))
                {
                    logo = File.ReadAllText(logoFile, Encoding.UTF8);
                    var start = logo.IndexOf("<svg", StringComparison.Ordinal);
                    logo = start >= 0 ? logo.Substring(start) : "";
                }
                var steps = new StringBuilder();
                var labels = new[] { t["stepImages"], t["stepDatabase"], t["stepServer"] };
                for (var i = 0; i < labels.Length; i++)
                {
                    var state = i < waitStep ? "done" : i == waitStep ? "current" : "todo";
                    steps.Append("<li class=\"" + state + "\"><span class=\"mark\"></span>" + WebUtility.HtmlEncode(labels[i]) + "</li>");
                }
                var html = File.ReadAllText(template, Encoding.UTF8)
                    .Replace("{{LANG}}", t["lang"])
                    .Replace("{{PAGE_TITLE}}", WebUtility.HtmlEncode(failed ? t["waitFailTitle"] : t["waitTitle"]))
                    .Replace("{{TITLE}}", WebUtility.HtmlEncode(failed ? t["waitFailTitle"] : t["waitTitle"]))
                    .Replace("{{TEXT}}", WebUtility.HtmlEncode(failed ? t["waitFailText"] : t["waitText"]))
                    .Replace("{{STEPS_LABEL}}", WebUtility.HtmlEncode(t["waitTitle"]))
                    .Replace("{{STEPS}}", steps.ToString())
                    .Replace("{{NOTE}}", failed
                        ? WebUtility.HtmlEncode(t["waitLog"]) + " <code>" + WebUtility.HtmlEncode(logFile) + "</code>"
                        : WebUtility.HtmlEncode(t["waitNote"]))
                    .Replace("{{STATE}}", failed ? "fail" : "wait")
                    .Replace("{{PORT}}", port.ToString())
                    .Replace("{{LOGO}}", logo);
                File.WriteAllText(WaitFile(dataDir), html, new UTF8Encoding(false));
            }
            catch (Exception e) { Log("Could not write the waiting page: " + e.Message); }
        }

        void CopyAddress()
        {
            var ip = LanAddress();
            if (ip == null) return;
            Clipboard.SetText("http://" + ip + ":" + settings.Port + "/");
            icon.ShowBalloonTip(3000, "Lockstep", t["copied"], ToolTipIcon.Info);
        }

        void UpdateAddress()
        {
            var ip = LanAddress();
            addressItem.Text = ip == null ? t["address"] + ": –" : t["address"] + ": http://" + ip + ":" + settings.Port;
            addressItem.ToolTipText = t["copyHint"];
        }

        bool AutostartEnabled()
        {
            using (var key = Registry.CurrentUser.OpenSubKey(RunKey))
                return key != null && key.GetValue("Lockstep") != null;
        }

        void ToggleAutostart()
        {
            using (var key = Registry.CurrentUser.CreateSubKey(RunKey))
            {
                if (AutostartEnabled()) key.DeleteValue("Lockstep", false);
                else key.SetValue("Lockstep", "\"" + Application.ExecutablePath + "\"");
            }
            autostartItem.Checked = AutostartEnabled();
        }

        void CheckForUpdate()
        {
            try
            {
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; // TLS 1.2
                var request = (HttpWebRequest)WebRequest.Create("https://api.github.com/repos/smiei/lockstep/releases/latest");
                request.UserAgent = "Lockstep-Windows/" + Build.Version;
                request.Timeout = 10000;
                string body;
                using (var response = request.GetResponse())
                using (var reader = new StreamReader(response.GetResponseStream()))
                    body = reader.ReadToEnd();
                var tag = Regex.Match(body, "\"tag_name\"\\s*:\\s*\"v?(\\d+)\\.(\\d+)");
                if (!tag.Success) return;
                var latest = new Version(int.Parse(tag.Groups[1].Value), int.Parse(tag.Groups[2].Value));
                var own = new Version(Build.Version);
                if (latest > new Version(own.Major, own.Minor))
                {
                    Ui(delegate
                    {
                        updateItem.Text = t["update"] + " " + latest.Major + "." + latest.Minor;
                        updateItem.Visible = true;
                    });
                }
            }
            catch (Exception) { /* offline or rate-limited: say nothing */ }
        }

        // ---- helpers ----------------------------------------------------------

        void SetStatus(string text, bool warn)
        {
            Ui(delegate
            {
                var tip = "Lockstep – " + text;
                icon.Text = tip.Length > 63 ? tip.Substring(0, 63) : tip;
                if (warn) icon.ShowBalloonTip(5000, "Lockstep", text, ToolTipIcon.Warning);
            });
        }

        void Ui(MethodInvoker action)
        {
            if (ui.InvokeRequired) ui.BeginInvoke(action); else action();
        }

        void Log(string line)
        {
            lock (logLock)
            {
                try { File.AppendAllText(logFile, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "  " + line + Environment.NewLine, Encoding.UTF8); }
                catch (Exception) { }
            }
        }

        void RotateLog()
        {
            lock (logLock)
            {
                try
                {
                    if (File.Exists(logFile) && new FileInfo(logFile).Length > 5 * 1024 * 1024)
                    {
                        var old = Path.Combine(logDir, "server.old.log");
                        if (File.Exists(old)) File.Delete(old);
                        File.Move(logFile, old);
                    }
                }
                catch (Exception) { }
            }
        }

        // Free means: nothing answers on either loopback and the port can be
        // bound. Both checks matter - Docker Desktop, for one, listens on IPv6
        // only, so binding IPv4 succeeds while the browser's "localhost" (::1)
        // would reach the other server. Only loopback is bound here: binding
        // every address would make the Windows firewall ask about this exe.
        static bool PortFree(int port)
        {
            foreach (var address in new[] { IPAddress.Loopback, IPAddress.IPv6Loopback })
            {
                try
                {
                    using (var client = new TcpClient(address.AddressFamily))
                    {
                        var attempt = client.BeginConnect(address, port, null, null);
                        if (attempt.AsyncWaitHandle.WaitOne(500))
                        {
                            client.EndConnect(attempt);
                            return false; // someone accepted the connection
                        }
                    }
                }
                catch (Exception) { /* refused or no IPv6: nobody there */ }
            }
            try
            {
                var listener = new TcpListener(IPAddress.Loopback, port);
                listener.Start();
                listener.Stop();
                return true;
            }
            catch (SocketException) { return false; }
        }

        public static bool Healthy(int port)
        {
            try
            {
                var request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/api/health");
                request.Timeout = 2000;
                using (var response = (HttpWebResponse)request.GetResponse())
                    return (int)response.StatusCode < 500;
            }
            catch (Exception) { return false; }
        }

        // The address other devices on the home network use: the IPv4 address
        // of an active adapter that has a default gateway.
        static string LanAddress()
        {
            string fallback = null;
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.OperationalStatus != OperationalStatus.Up || nic.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                var props = nic.GetIPProperties();
                foreach (var addr in props.UnicastAddresses)
                {
                    if (addr.Address.AddressFamily != AddressFamily.InterNetwork) continue;
                    if (props.GatewayAddresses.Count > 0) return addr.Address.ToString();
                    if (fallback == null) fallback = addr.Address.ToString();
                }
            }
            return fallback;
        }

        public static void OpenUrl(string target)
        {
            try { Process.Start(new ProcessStartInfo(target) { UseShellExecute = true }); }
            catch (Exception) { }
        }
    }

    // Kills every process assigned to it when it is closed - including when
    // this exe dies, since Windows then closes the handle for us.
    class Job : IDisposable
    {
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
        static extern IntPtr CreateJobObject(IntPtr attributes, string name);
        [DllImport("kernel32.dll")]
        static extern bool SetInformationJobObject(IntPtr job, int infoClass, ref ExtendedLimits info, int length);
        [DllImport("kernel32.dll")]
        static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
        [DllImport("kernel32.dll")]
        static extern bool CloseHandle(IntPtr handle);

        [StructLayout(LayoutKind.Sequential)]
        struct BasicLimits
        {
            public long PerProcessUserTimeLimit, PerJobUserTimeLimit;
            public uint LimitFlags;
            public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize;
            public uint ActiveProcessLimit;
            public UIntPtr Affinity;
            public uint PriorityClass, SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct IoCounters
        {
            public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount, ReadTransferCount, WriteTransferCount, OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct ExtendedLimits
        {
            public BasicLimits Basic;
            public IoCounters Io;
            public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed;
        }

        IntPtr handle;

        public Job()
        {
            handle = CreateJobObject(IntPtr.Zero, null);
            var info = new ExtendedLimits();
            info.Basic.LimitFlags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            SetInformationJobObject(handle, 9, ref info, Marshal.SizeOf(typeof(ExtendedLimits)));
        }

        public void Add(Process p) { AssignProcessToJobObject(handle, p.Handle); }

        public void Dispose()
        {
            if (handle != IntPtr.Zero) { CloseHandle(handle); handle = IntPtr.Zero; }
        }
    }

    static class Texts
    {
        public static Dictionary<string, string> For(string lang)
        {
            var en = new Dictionary<string, string>
            {
                { "open", "Open Lockstep" }, { "address", "Address for other devices" }, { "copyHint", "Click to copy" },
                { "copied", "Address copied. Open it on a phone in the same Wi-Fi." },
                { "dataFolder", "Open data folder" }, { "log", "Open log" }, { "autostart", "Start with Windows" },
                { "restart", "Restart server" }, { "quit", "Quit" }, { "update", "Update available:" },
                { "starting", "starting… (first start downloads images)" }, { "running", "running" }, { "runningText", "Lockstep is running:" },
                { "stopped", "stopped - see the log" }, { "failed", "could not start" },
                { "failedText", "Lockstep could not start. Open the log?" },
                { "lang", "en" }, { "trayHint", "Lockstep runs in the notification area down here. Right-click the icon for the menu." }, { "waitTitle", "Lockstep is starting …" }, { "waitText", "The first start downloads the Pokémon pictures, which takes a few minutes. This page switches to Lockstep by itself." }, { "waitNote", "You can close this tab - Lockstep keeps running in the notification area." }, { "stepImages", "Downloading pictures" }, { "stepDatabase", "Preparing the database" }, { "stepServer", "Starting the server" }, { "waitFailTitle", "Lockstep could not start" }, { "waitFailText", "Try \"Restart server\" in the tray icon's menu. If that does not help, the log says what went wrong." }, { "waitLog", "Log:" },
            };
            Dictionary<string, string> other = null;
            if (lang == "de") other = new Dictionary<string, string>
            {
                { "open", "Lockstep öffnen" }, { "address", "Adresse für andere Geräte" }, { "copyHint", "Klicken zum Kopieren" },
                { "copied", "Adresse kopiert. Auf einem Handy im selben WLAN öffnen." },
                { "dataFolder", "Datenordner öffnen" }, { "log", "Log öffnen" }, { "autostart", "Mit Windows starten" },
                { "restart", "Server neu starten" }, { "quit", "Beenden" }, { "update", "Update verfügbar:" },
                { "starting", "startet… (erster Start lädt Bilder)" }, { "running", "läuft" }, { "runningText", "Lockstep läuft:" },
                { "stopped", "gestoppt - siehe Log" }, { "failed", "Start fehlgeschlagen" },
                { "failedText", "Lockstep konnte nicht starten. Log öffnen?" },
                { "lang", "de" }, { "trayHint", "Lockstep läuft hier unten im Infobereich. Rechtsklick auf das Symbol öffnet das Menü." }, { "waitTitle", "Lockstep startet …" }, { "waitText", "Beim ersten Start werden die Pokémon-Bilder geladen, das dauert ein paar Minuten. Diese Seite wechselt von selbst zu Lockstep." }, { "waitNote", "Du kannst diesen Tab schließen – Lockstep läuft im Infobereich weiter." }, { "stepImages", "Bilder werden geladen" }, { "stepDatabase", "Datenbank wird vorbereitet" }, { "stepServer", "Server startet" }, { "waitFailTitle", "Lockstep konnte nicht starten" }, { "waitFailText", "Versuch „Server neu starten“ im Menü des Tray-Symbols. Hilft das nicht, steht im Log, was schiefging." }, { "waitLog", "Log:" },
            };
            else if (lang == "fr") other = new Dictionary<string, string>
            {
                { "open", "Ouvrir Lockstep" }, { "address", "Adresse pour les autres appareils" }, { "copyHint", "Cliquer pour copier" },
                { "copied", "Adresse copiée. Ouvre-la sur un téléphone du même Wi-Fi." },
                { "dataFolder", "Ouvrir le dossier des données" }, { "log", "Ouvrir le journal" }, { "autostart", "Démarrer avec Windows" },
                { "restart", "Redémarrer le serveur" }, { "quit", "Quitter" }, { "update", "Mise à jour disponible :" },
                { "starting", "démarrage… (le premier lancement télécharge les images)" }, { "running", "en marche" }, { "runningText", "Lockstep est lancé :" },
                { "stopped", "arrêté - voir le journal" }, { "failed", "échec du démarrage" },
                { "failedText", "Lockstep n'a pas pu démarrer. Ouvrir le journal ?" },
                { "lang", "fr" }, { "trayHint", "Lockstep tourne ici, dans la zone de notification. Clic droit sur l'icône pour le menu." }, { "waitTitle", "Lockstep démarre …" }, { "waitText", "Le premier démarrage télécharge les images des Pokémon, cela prend quelques minutes. Cette page bascule toute seule vers Lockstep." }, { "waitNote", "Tu peux fermer cet onglet : Lockstep continue de tourner dans la zone de notification." }, { "stepImages", "Téléchargement des images" }, { "stepDatabase", "Préparation de la base de données" }, { "stepServer", "Démarrage du serveur" }, { "waitFailTitle", "Lockstep n'a pas pu démarrer" }, { "waitFailText", "Essaie « Redémarrer le serveur » dans le menu de l'icône. Si cela ne suffit pas, le journal indique le problème." }, { "waitLog", "Journal :" },
            };
            else if (lang == "es") other = new Dictionary<string, string>
            {
                { "open", "Abrir Lockstep" }, { "address", "Dirección para otros dispositivos" }, { "copyHint", "Clic para copiar" },
                { "copied", "Dirección copiada. Ábrela en un móvil de la misma wifi." },
                { "dataFolder", "Abrir carpeta de datos" }, { "log", "Abrir registro" }, { "autostart", "Iniciar con Windows" },
                { "restart", "Reiniciar servidor" }, { "quit", "Salir" }, { "update", "Actualización disponible:" },
                { "starting", "iniciando… (el primer inicio descarga imágenes)" }, { "running", "en marcha" }, { "runningText", "Lockstep está en marcha:" },
                { "stopped", "detenido - mira el registro" }, { "failed", "no se pudo iniciar" },
                { "failedText", "Lockstep no pudo iniciarse. ¿Abrir el registro?" },
                { "lang", "es" }, { "trayHint", "Lockstep se ejecuta aquí, en el área de notificación. Clic derecho en el icono para el menú." }, { "waitTitle", "Lockstep se está iniciando …" }, { "waitText", "El primer inicio descarga las imágenes de los Pokémon y tarda unos minutos. Esta página cambiará sola a Lockstep." }, { "waitNote", "Puedes cerrar esta pestaña: Lockstep sigue en marcha en el área de notificación." }, { "stepImages", "Descargando imágenes" }, { "stepDatabase", "Preparando la base de datos" }, { "stepServer", "Iniciando el servidor" }, { "waitFailTitle", "Lockstep no pudo iniciarse" }, { "waitFailText", "Prueba «Reiniciar servidor» en el menú del icono. Si no ayuda, el registro dice qué falló." }, { "waitLog", "Registro:" },
            };
            else if (lang == "it") other = new Dictionary<string, string>
            {
                { "open", "Apri Lockstep" }, { "address", "Indirizzo per altri dispositivi" }, { "copyHint", "Clic per copiare" },
                { "copied", "Indirizzo copiato. Aprilo su un telefono nella stessa Wi-Fi." },
                { "dataFolder", "Apri cartella dati" }, { "log", "Apri log" }, { "autostart", "Avvia con Windows" },
                { "restart", "Riavvia server" }, { "quit", "Esci" }, { "update", "Aggiornamento disponibile:" },
                { "starting", "avvio… (il primo avvio scarica le immagini)" }, { "running", "in esecuzione" }, { "runningText", "Lockstep è in esecuzione:" },
                { "stopped", "fermato - vedi il log" }, { "failed", "avvio non riuscito" },
                { "failedText", "Lockstep non è riuscito ad avviarsi. Aprire il log?" },
                { "lang", "it" }, { "trayHint", "Lockstep è in esecuzione qui, nell'area di notifica. Clic destro sull'icona per il menu." }, { "waitTitle", "Lockstep si sta avviando …" }, { "waitText", "Il primo avvio scarica le immagini dei Pokémon e richiede qualche minuto. Questa pagina passerà da sola a Lockstep." }, { "waitNote", "Puoi chiudere questa scheda: Lockstep resta attivo nell'area di notifica." }, { "stepImages", "Download delle immagini" }, { "stepDatabase", "Preparazione del database" }, { "stepServer", "Avvio del server" }, { "waitFailTitle", "Lockstep non è riuscito ad avviarsi" }, { "waitFailText", "Prova «Riavvia server» nel menu dell'icona. Se non basta, il log indica cosa non ha funzionato." }, { "waitLog", "Log:" },
            };
            if (other != null) foreach (var kv in other) en[kv.Key] = kv.Value;
            return en;
        }
    }
}
