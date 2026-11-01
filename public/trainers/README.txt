TRAINER AVATARS  (Reise / Journey page)
=======================================

PNGs shown next to each trainer. A missing file just shows an initial-letter
placeholder - never an error. These are NOT in the repo or the Docker image
(copyrighted art).

AUTOMATIC: on first start (Docker / Pinokio / Windows app / `npm run setup`)
the app downloads every mapped trainer from Pokemon Showdown into the
per-game folders below (scripts/download-trainers.mjs, map in
data/trainer-sprite-sources.json). Only missing files are fetched; set
TRAINER_SPRITES=off to skip it. Trainers marked * below have no picture on
Showdown under any name we know, so they show the letter placeholder unless
you add a file yourself.

YOUR OWN PICTURES ALWAYS WIN: a file you put here is never overwritten, and a
trainer that has a file of yours in this ROOT gets nothing downloaded for any
game. With Docker, mount THIS folder as /app/public/trainers. Recommended
size >=80x80px, square (shown as a circle).

LOOKUP ORDER for each trainer:
  1. /trainers/<trainerSet>/<slug>.png    game-specific (checked FIRST)
  2. /trainers/<slug>.png                 shared fallback (this root)
  3. initial-letter placeholder

So: put a file in the flat ROOT to use it for ALL games; put one in a
<trainerSet> subfolder to override it for that game only.

<slug> = German name, lowercased, accents stripped, spaces & "&" -> "-".
  Examples: Rocko->rocko, "Ben & Svenja"->ben-svenja,
  "Vorstand Athena & Rüpel"->vorstand-athena-rupel, "Kimono-Mädels"->kimono-madels.
  The slug always uses the GERMAN name, whatever UI language is set. Packs
  that only have English names (Infinite Fusion, most ROM hacks) therefore get
  English slugs (brock.png ...).

trainerSet SUBFOLDERS (one per base game; ROM hacks share their base game's
folder, so a picture there serves all of them):
  firered/                FireRed / LeafGreen, New Generations, Radical Red
  emerald/                Emerald, Ruby, Sapphire, Emerald Kaizo, Inclement Emerald, Rising Ruby, Sinking Sapphire, Glazed, Run & Bun, Blazing Emerald
  red-blue/               Red / Blue / Yellow
  gold-silver/            Gold / Silver / Crystal
  platinum/               Platinum, Diamond / Pearl, Renegade Platinum
  heartgold-soulsilver/   HeartGold, SoulSilver, Sacred Gold, Storm Silver
  black-white/            Black, White, Blaze Black, Volt White, Blaze Black 2 / Volt White 2 Redux
  infinite-fusion/        Pokémon Infinite Fusion (Classic), Pokémon Infinite Fusion (Remix)
  black-2-white-2/        Black 2 / White 2
  x-y/                    X / Y
  omega-ruby-alpha-sapphire/Omega Ruby, Alpha Sapphire
  sun-moon/               Sun, Moon
  ultra-sun-ultra-moon/   Ultra Sun, Ultra Moon
  sword-shield/           Sword, Shield
  brilliant-diamond-shining-pearl/Brilliant Diamond / Shining Pearl
  scarlet-violet/         Scarlet / Violet
  unbound/                Unbound

NOTE ON THE RIVAL: every game calls its rival "Rivale" -> slug "rivale", but
it is a DIFFERENT character/look per game. Give each its own file in that
game's folder (red-blue/rivale.png, gold-silver/rivale.png, ...).
(FireRed/LeafGreen reuse the champion art for the rival -> firered uses champ.png.)
Recurring gym leaders/Elite Four (Rocko, Misty, ...) are the same person across
games: one file in the root is enough, unless you want generation-accurate art
- then drop a per-game copy in that game folder.

BY FOLDER - the games using it, then every trainer in journey order
(407 distinct slugs, 122 entries marked * without an automatic picture).
A name listed under several folders can live once in the root instead.

  FireRed / LeafGreen, New Generations, Radical Red  ->  firered/   (59)
    champ.png                   Rivale (Rival)
    rocko.png                   Rocko (Brock)
    misty.png                   Misty
    major-bob.png               Major Bob (Lt. Surge)
    erika.png                   Erika
    giovanni.png                Giovanni
    sabrina.png                 Sabrina
    koga.png                    Koga
    pyro.png                    Pyro (Blaine)
    lorelei.png                 Lorelei
    bruno.png                   Bruno
    agathe.png                  Agathe (Agatha)
    siegfried.png               Siegfried (Lance)
    roxanne.png                 Roxanne
    gym-laeder-joey.png         Gym Laeder Joey   *
    brawly.png                  Brawly
    gym-leaders-duff-eda.png    Gym Leaders Duff & Eda   *
    wattson.png                 Wattson
    gym-leader-franklin.png     Gym Leader Franklin   *
    flannery.png                Flannery
    gym-leader-charles.png      Gym Leader Charles   *
    norman.png                  Norman
    gym-leader-aaaaaaahhh.png   Gym Leader AAAAAAAHHH   *
    winona.png                  Winona
    gym-leader-bob.png          Gym Leader Bob   *
    tate-liza.png               Tate & Liza
    gym-leader-deidara.png      Gym Leader Deidara   *
    wallace.png                 Wallace
    gym-leader-eevolove.png     Gym Leader Eevolove   *
    gary.png                    Gary
    brendan.png                 Brendan
    falkner.png                 Falkner
    admin-archer.png            Admin Archer
    bugsy.png                   Bugsy
    whitney.png                 Whitney
    morty.png                   Morty
    archer-ariana.png           Archer & Ariana
    chuck.png                   Chuck
    pryce-team-a.png            Pryce (Team A)
    pryce-team-b.png            Pryce (Team B)
    pryce-team-c.png            Pryce (Team C)
    jasmine-team-a.png          Jasmine (Team A)
    jasmine-team-b.png          Jasmine (Team B)
    jasmine-team-c.png          Jasmine (Team C)
    may.png                     May
    clair.png                   Clair
    lorelei-team-a.png          Lorelei (Team A)
    lorelei-team-b.png          Lorelei (Team B)
    bruno-team-a.png            Bruno (Team A)
    bruno-team-b.png            Bruno (Team B)
    agatha-team-a.png           Agatha (Team A)
    agatha-team-b.png           Agatha (Team B)
    lance-team-a.png            Lance (Team A)
    lance-team-b.png            Lance (Team B)
    brock-rematch.png           Brock Rematch
    misty-rematch.png           Misty Rematch
    lt-surge-rematch.png        Lt. Surge Rematch
    erika-rematch.png           Erika Rematch
    admin-ariana.png            Admin Ariana

  Emerald, Ruby, Sapphire, Emerald Kaizo, Inclement Emerald, Rising Ruby, Sinking Sapphire, Glazed, Run & Bun, Blazing Emerald  ->  emerald/   (98)
    rivale.png                  Rivale (Rival)   *
    felizia.png                 Felizia (Roxanne)
    kamillo.png                 Kamillo (Brawly)
    heiko.png                   Heiko (Wally)
    walter.png                  Walter (Wattson)
    kalle.png                   Kalle (Tabitha)
    flavia.png                  Flavia (Flannery)
    norman.png                  Norman
    kordula.png                 Kordula (Shelly)
    wibke.png                   Wibke (Winona)
    maxie.png                   Maxie
    wolfgang.png                Wolfgang (Matt)
    ben-svenja.png              Ben & Svenja (Tate & Liza)
    maxie-kalle.png             Maxie & Kalle (Maxie & Tabitha)
    archie.png                  Archie
    juan.png                    Juan
    ulrich.png                  Ulrich (Sidney)
    antonia.png                 Antonia (Phoebe)
    frosina.png                 Frosina (Glacia)
    dragan.png                  Dragan (Drake)
    wassili.png                 Wassili (Wallace)
    troy-trumm.png              Troy Trumm (Steven)
    maike.png                   Maike (May)
    jordis.png                  Jördis (Courtney)
    red.png                     Red
    brandan-optional.png        Brandan (optional)
    may-optional.png            May (optional)
    magma-admin-tabitha.png     Magma Admin Tabitha
    magma-leader-maxie.png      Magma Leader Maxie
    brendan.png                 Brendan
    may.png                     May
    aqua-admin-shelly.png       Aqua Admin Shelly
    aqua-admin-matt.png         Aqua Admin Matt
    magma-admin-courtney.png    Magma Admin Courtney
    magma-leader-maxie-admin-tabitha.pngMagma Leader Maxie & Admin Tabitha
    aqua-leader-archie.png      Aqua Leader Archie
    grunt.png                   Grunt   *
    grunts.png                  Grunts   *
    courtney.png                Courtney
    tabitha-courtney.png        Tabitha & Courtney
    maxie-courtney.png          Maxie & Courtney
    tabitha-grunt.png           Tabitha & Grunt
    courtney-grunt.png          Courtney & Grunt
    shelly-grunt.png            Shelly & Grunt
    matt-grunt.png              Matt & Grunt
    chelle.png                  Chelle   *
    sparky.png                  Sparky   *
    terry.png                   Terry   *
    fusion-boss-michael.png     Fusion Boss Michael   *
    percy.png                   Percy   *
    cato.png                    Cato   *
    flo.png                     Flo   *
    lief.png                    Lief   *
    team-fusion-henri.png       Team Fusion Henri   *
    irene.png                   Irene   *
    ernest.png                  Ernest   *
    nicole.png                  Nicole   *
    fusion-boss-regina.png      Fusion Boss Regina   *
    cameron-optional.png        Cameron (optional)   *
    tyson.png                   Tyson   *
    soheal.png                  Soheal   *
    lucbui.png                  Lucbui   *
    rosaline.png                Rosaline   *
    magnus.png                  Magnus
    tanya.png                   Tanya   *
    gray.png                    Gray   *
    blake.png                   Blake   *
    fusion-boss-rgina.png       Fusion Boss Rgina   *
    falkner.png                 Falkner
    morty.png                   morty
    jasmine.png                 Jasmine
    bugsy.png                   Bugsy
    simon.png                   Simon   *
    alpha-lader-pius-alpha-sexton.pngAlpha Lader Pius & Alpha Sexton   *
    brian.png                   Brian   *
    alexa.png                   Alexa   *
    silver.png                  Silver
    clair.png                   Clair
    ivan.png                    Ivan   *
    whitney.png                 Whitney
    powell.png                  Powell   *
    eusine.png                  Eusine
    kris.png                    Kris
    tye.png                     Tye   *
    thor.png                    Thor   *
    ricky.png                   Ricky   *
    gym-guardian-will.png       Gym Guardian Will   *
    sora.png                    Sora   *
    pokefan-x.png               PokeFan X   *
    makunouchi.png              Makunouchi   *
    alpha-sexton.png            Alpha Sexton   *
    alpha-leader-pius.png       Alpha Leader Pius   *
    soul.png                    Soul   *
    pokemon-trainer-red.png     Pokemon Trainer Red
    aqua-grunt.png              Aqua Grunt
    winstrate-vito.png          Winstrate Vito   *
    serena.png                  Serena
    bede.png                    Bede

  Red / Blue / Yellow  ->  red-blue/   (14)
    rivale.png                  Rivale (Rival)
    rocko.png                   Rocko (Brock)
    misty.png                   Misty
    major-bob.png               Major Bob (Lt. Surge)
    erika.png                   Erika
    giovanni.png                Giovanni
    koga.png                    Koga
    sabrina.png                 Sabrina
    pyro.png                    Pyro (Blaine)
    lorelei.png                 Lorelei
    bruno.png                   Bruno
    agathe.png                  Agathe (Agatha)
    siegfried.png               Siegfried (Lance)
    champ.png                   Champ (Champion)

  Gold / Silver / Crystal  ->  gold-silver/   (23)
    falk.png                    Falk (Falkner)
    rivale.png                  Rivale (Rival)
    kai.png                     Kai (Bugsy)
    bianka.png                  Bianka (Whitney)
    jens.png                    Jens (Morty)
    hartwig.png                 Hartwig (Chuck)
    jasmin.png                  Jasmin (Jasmine)
    norbert.png                 Norbert (Pryce)
    sandra.png                  Sandra (Clair)
    willi.png                   Willi (Will)
    koga.png                    Koga
    bruno.png                   Bruno
    melanie.png                 Melanie (Karen)
    siegfried.png               Siegfried (Lance)
    major-bob.png               Major Bob (Lt. Surge)
    sabrina.png                 Sabrina
    misty.png                   Misty
    erika.png                   Erika
    janina.png                  Janina (Janine)
    rocko.png                   Rocko (Brock)
    pyro.png                    Pyro (Blaine)
    blau.png                    Blau (Blue)
    rot.png                     Rot (Red)

  Platinum, Diamond / Pearl, Renegade Platinum  ->  platinum/   (48)
    rivale.png                  Rivale (Rival)
    veit.png                    Veit (Roark)
    mars.png                    Mars
    silvana.png                 Silvana (Gardenia)
    jupiter.png                 Jupiter
    lamina.png                  Lamina (Fantina)
    hilda.png                   Hilda (Maylene)
    marinus.png                 Marinus (Crasher Wake)
    zyrus.png                   Zyrus (Cyrus)
    adam.png                    Adam (Byron)
    saturn.png                  Saturn
    frida.png                   Frida (Candice)
    mars-jupiter.png            Mars & Jupiter
    volkner.png                 Volkner
    herbaro.png                 Herbaro (Aaron)
    teresa.png                  Teresa (Bertha)
    ignaz.png                   Ignaz (Flint)
    lucian.png                  Lucian
    cynthia.png                 Cynthia
    barry.png                   Barry
    cheryl.png                  Cheryl
    lucas.png                   Lucas
    dawn.png                    Dawn
    mira.png                    Mira
    saturn-gentleman-backlot.pngSaturn & Gentleman Backlot
    castle-valet-darach.png     Castle Valet Darach
    riley.png                   Riley
    arcade-star-dahlia.png      Arcade Star Dahlia
    aaron-team-a.png            Aaron (Team A)
    aaron-team-b.png            Aaron (Team B)
    aaron-team-c.png            Aaron (Team C)
    aaron-team-d.png            Aaron (Team D)
    bertha-team-a.png           Bertha (Team A)
    bertha-team-b.png           Bertha (Team B)
    bertha-team-c.png           Bertha (Team C)
    bertha-team-d.png           Bertha (Team D)
    flint-team-a.png            Flint (Team A)
    flint-team-b.png            Flint (Team B)
    flint-team-c.png            Flint (Team C)
    flint-team-d.png            Flint (Team D)
    lucian-team-a.png           Lucian (Team A)
    lucian-team-b.png           Lucian (Team B)
    lucian-team-c.png           Lucian (Team C)
    lucian-team-d.png           Lucian (Team D)
    cynthia-team-a.png          Cynthia (Team A)
    cynthia-team-b.png          Cynthia (Team B)
    cynthia-team-c.png          Cynthia (Team C)
    cynthia-team-d.png          Cynthia (Team D)

  HeartGold, SoulSilver, Sacred Gold, Storm Silver  ->  heartgold-soulsilver/   (35)
    rivale.png                  Rivale (Rival)
    weise-li.png                Weise Li (Elder Li)
    falk.png                    Falk (Falkner)
    vorstand-lanzo.png          Vorstand Lanzo (Executive Proton)
    kai.png                     Kai (Bugsy)
    bianka.png                  Bianka (Whitney)
    jens.png                    Jens (Morty)
    eusin.png                   Eusin (Eusine)
    hartwig.png                 Hartwig (Chuck)
    jasmin.png                  Jasmin (Jasmine)
    vorstand-lamda.png          Vorstand Lamda (Executive Petrel)
    vorstand-athena-rupel.png   Vorstand Athena & Rüpel (Executive Ariana & Grunt)
    norbert.png                 Norbert (Pryce)
    vorstand-athena.png         Vorstand Athena (Executive Ariana)
    vorstand-atlas.png          Vorstand Atlas (Executive Archer)
    sandra.png                  Sandra (Clair)
    kimono-madels.png           Kimono-Mädels (Kimono Girls)
    willi.png                   Willi (Will)
    koga.png                    Koga
    bruno.png                   Bruno
    melanie.png                 Melanie (Karen)
    siegfried.png               Siegfried (Lance)
    major-bob.png               Major Bob (Lt. Surge)
    sabrina.png                 Sabrina
    erika.png                   Erika
    janina.png                  Janina (Janine)
    misty.png                   Misty
    rocko.png                   Rocko (Brock)
    pyro.png                    Pyro (Blaine)
    blau.png                    Blau (Blue)
    rot.png                     Rot (Red)
    silver.png                  Silver
    ethan.png                   Ethan
    lyra.png                    Lyra
    rocket-boss-giovanni.png    Rocket Boss Giovanni

  Black, White, Blaze Black, Volt White, Blaze Black 2 / Volt White 2 Redux  ->  black-white/   (44)
    cheren.png                  Cheren
    benny-maik-colin.png        Benny, Maik & Colin (Cilan, Chili & Cress)
    bel.png                     Bel (Bianca)
    aloe.png                    Aloe (Lenora)
    n.png                       N
    artie.png                   Artie (Burgh)
    kamilla.png                 Kamilla (Elesa)
    turner.png                  Turner (Clay)
    geraldine.png               Géraldine (Skyla)
    sandro.png                  Sandro (Brycen)
    g-cis.png                   G-Cis (Ghetsis)
    lysander.png                Lysander (Drayden)
    anissa.png                  Anissa (Shauntal)
    astor.png                   Astor (Grimsley)
    kattlea.png                 Kattlea (Caitlin)
    eugen.png                   Eugen (Marshal)
    lauro.png                   Lauro (Alder)
    lilia.png                   Lilia (Iris)
    chili-cress-or-cilan.png    Chili, Cress or Cilan
    cynthia.png                 Cynthia
    hugh.png                    Hugh
    roxanne.png                 Roxanne
    brawly.png                  Brawly
    roxie.png                   Roxie
    wattson.png                 Wattson
    colress.png                 Colress
    ingo-emmet.png              Ingo & Emmet
    nate-rosa.png               Nate & Rosa
    flannery.png                Flannery
    charles.png                 Charles   *
    rood.png                    Rood
    norman.png                  Norman
    juan.png                    Juan
    zinzolin-grunt.png          Zinzolin & Grunt
    benga.png                   Benga
    winona.png                  Winona
    tate-liza.png               Tate & Liza
    marlon.png                  Marlon
    zinzolin.png                Zinzolin
    hail-trainer-caroll.png     Hail Trainer Caroll   *
    sun-trainer-elmer.png       Sun Trainer Elmer   *
    rain-trainer-porta.png      Rain Trainer Porta   *
    sand-trainer-sterling.png   Sand Trainer Sterling   *
    iris.png                    Iris

  Pokémon Infinite Fusion (Classic), Pokémon Infinite Fusion (Remix)  ->  infinite-fusion/   (21)
    brock.png                   Brock
    misty.png                   Misty
    lt-surge.png                Lt. Surge
    erika.png                   Erika
    koga.png                    Koga
    sabrina.png                 Sabrina
    blaine.png                  Blaine
    giovanni.png                Giovanni
    falkner.png                 Falkner
    kurt.png                    Kurt
    whitney.png                 Whitney
    morty.png                   Morty
    chuck.png                   Chuck
    jasmine.png                 Jasmine
    pryce.png                   Pryce
    clair.png                   Clair
    lorelei.png                 Lorelei
    bruno.png                   Bruno
    agatha.png                  Agatha
    lance.png                   Lance
    champ.png                   Champion

  Black 2 / White 2  ->  black-2-white-2/   (20)
    matisse.png                 Matisse (Hugh)
    cheren.png                  Cheren
    mica.png                    Mica (Roxie)
    artie.png                   Artie (Burgh)
    achromas.png                Achromas (Colress)
    hin-her.png                 Hin & Her (Ingo & Emmet)
    kamilla.png                 Kamilla (Elesa)
    turner.png                  Turner (Clay)
    geraldine.png               Géraldine (Skyla)
    violaceus-rupel.png         Violaceus & Rüpel (Zinzolin & Grunt)
    lysander.png                Lysander (Drayden)
    violaceus.png               Violaceus (Zinzolin)
    shadow.png                  Shadow   *
    benson.png                  Benson (Marlon)
    g-cis.png                   G-Cis (Ghetsis)
    anissa.png                  Anissa (Shauntal)
    astor.png                   Astor (Grimsley)
    kattlea.png                 Kattlea (Caitlin)
    eugen.png                   Eugen (Marshal)
    lilia.png                   Lilia (Iris)

  X / Y  ->  x-y/   (26)
    sannah.png                  Sannah (Shauna)
    viola.png                   Viola
    professor-platan.png        Professor Platan (Sycamore)
    tierno.png                  Tierno
    trovato-tierno.png          Trovato & Tierno (Trevor & Tierno)
    lino.png                    Lino (Grant)
    connie.png                  Connie (Korrina)
    serena.png                  Serena
    amaro.png                   Amaro (Ramos)
    aliana.png                  Aliana   *
    citro.png                   Citro (Clemont)
    valeria.png                 Valeria   *
    calluna-begonia.png         Calluna & Begonia (Celosia & Bryony)   *
    magnolia.png                Magnolia (Mable)
    astrid.png                  Astrid (Olympia)
    flordelis.png               Flordelis (Lysandre)
    calluna.png                 Calluna (Celosia)   *
    begonia.png                 Begonia (Bryony)
    xeros.png                   Xeros (Xerosic)
    trovato.png                 Trovato (Trevor)
    galantho.png                Galantho (Wulfric)
    pachira.png                 Pachira (Malva)
    narcisse.png                Narcisse (Siebold)
    thymelot.png                Thymelot (Wikstrom)
    dracena.png                 Dracena (Drasna)
    diantha.png                 Diantha

  Omega Ruby, Alpha Sapphire  ->  omega-ruby-alpha-sapphire/   (26)
    rivale.png                  Rivale (Rival)   *
    felizia.png                 Felizia (Roxanne)
    kamillo.png                 Kamillo (Brawly)
    heiko.png                   Heiko (Wally)
    walter.png                  Walter (Wattson)
    kalle-rupel.png             Kalle & Rüpel (Tabitha & Grunt)
    kalle.png                   Kalle (Tabitha)
    maxie.png                   Maxie
    flavia.png                  Flavia (Flannery)
    norman.png                  Norman
    jordis-rupel.png            Jördis & Rüpel (Courtney & Grunt)
    johnson.png                 Johnson (Aarune)
    wibke.png                   Wibke (Winona)
    jordis.png                  Jördis (Courtney)
    ben-svenja.png              Ben & Svenja (Tate & Liza)
    wassili.png                 Wassili (Wallace)
    ulrich.png                  Ulrich (Sidney)
    antonia.png                 Antonia (Phoebe)
    frosina.png                 Frosina (Glacia)
    dragan.png                  Dragan (Drake)
    troy-trumm.png              Troy Trumm (Steven)
    kordula-rupel.png           Kordula & Rüpel (Shelly & Grunt)
    kordula.png                 Kordula (Shelly)
    archie.png                  Archie
    wolfgang-rupel.png          Wolfgang & Rüpel (Matt & Grunt)
    wolfgang.png                Wolfgang (Matt)

  Sun, Moon  ->  sun-moon/   (25)
    tali.png                    Tali (Hau)
    elima.png                   Elima (Ilima)
    prufung-von-elima.png       Prüfung von Elima (Ilima's trial)   *
    hala.png                    Hala
    dexio.png                   Dexio
    gladio.png                  Gladio (Gladion)
    prufung-von-tracy.png       Prüfung von Tracy (Lana's trial)   *
    prufung-von-kiawe.png       Prüfung von Kiawe (Kiawe's trial)   *
    prufung-von-maho.png        Prüfung von Maho (Mallow's trial)   *
    fran.png                    Fran (Plumeria)
    mayla.png                   Mayla (Island Kahuna Olivia)   *
    marlon.png                  Marlon (Molayne)
    sophocles-trial.png         Sophocles' trial   *
    bromley.png                 Bromley (Guzma)
    prufung-von-lola.png        Prüfung von Lola (Acerola's Trial)   *
    yasu.png                    Yasu (Island Kahuna Nanu)   *
    fabian.png                  Fabian (Faba)
    fabian-angestellter.png     Fabian & Angestellter (Faba & Employee)
    samantha.png                Samantha (Lusamine)
    hapu-u.png                  Hapu’u (Island Kahuna Hapu)   *
    kommo-o-s-trial.png         Kommo-o's Trial   *
    lola.png                    Lola (Acerola)
    kahili.png                  Kahili
    professor-kukui.png         Professor Kukui (Kukui)
    sina.png                    Sina

  Ultra Sun, Ultra Moon  ->  ultra-sun-ultra-moon/   (39)
    tali.png                    Tali (Hau)
    elima.png                   Elima (Ilima)
    prufung-von-elima.png       Prüfung von Elima (Ilima's Trial)   *
    darus.png                   Darus (Dulse)
    hala.png                    Hala (Island Kahuna Hala)   *
    dexio.png                   Dexio
    gladio.png                  Gladio (Gladion)
    prufung-von-tracy.png       Prüfung von Tracy (Lana's Trial)   *
    paniola-ranch.png           Paniola Ranch   *
    prufung-von-kiawe.png       Prüfung von Kiawe (Kiawe's Trial)   *
    prufung-von-maho.png        Prüfung von Maho (Mallow's Trial)   *
    fran.png                    Fran (Plumeria)
    mayla.png                   Mayla (Island Kahuna Olivia)   *
    ryuki.png                   Ryuki
    sophocles-trial.png         Sophocles' Trial   *
    bromley.png                 Bromley (Guzma)
    prufung-von-lola.png        Prüfung von Lola (Acerola's Trial)   *
    yasu.png                    Yasu (Island Kahuna Nanu)   *
    fabian.png                  Fabian (Faba)
    fabian-angestellter.png     Fabian & Angestellter (Faba & Employee)
    samantha.png                Samantha (Lusamine)
    kommo-o-s-trial.png         Kommo-o's Trial   *
    necrozma.png                Necrozma   *
    matsurika.png               Matsurika (Captain Mina)   *
    maho.png                    Maho (Captain Mallow)   *
    kiawe.png                   Kiawe (Captain Kiawe)   *
    chrys.png                   Chrys (Captain Sophocles)   *
    prufung-von-matsurika.png   Prüfung von Matsurika (Mina's Trial)   *
    hapu-u.png                  Hapu’u (Island Kahuna Hapu)   *
    marlon.png                  Marlon (Molayne)
    lola.png                    Lola (Acerola)
    kahili.png                  Kahili
    marc.png                    Marc (Maxie)
    adrian.png                  Adrian (Archie)
    zyrus.png                   Zyrus (Cyrus)
    flordelis.png               Flordelis (Lysandre)
    g-cis.png                   G-Cis (Ghetsis)
    giovanni.png                Giovanni
    mirin.png                   Mirin (Soliera)

  Sword, Shield  ->  sword-shield/   (20)
    hop.png                     Hop
    betys.png                   Betys (Bede)
    yarro.png                   Yarro (Milo)
    kate.png                    Kate (Nessa)
    mary.png                    Mary (Marnie)
    kabu.png                    Kabu
    saida.png                   Saida (Bea)
    papella.png                 Papella (Opal)
    mac.png                     Mac (Gordie)
    nezz.png                    Nezz (Piers)
    roy.png                     Roy (Raihan)
    olivia.png                  Olivia (Oleana)
    rose.png                    Rose
    delion.png                  Delion (Champion Leon)   *
    sophora.png                 Sophora (Klara)
    mastrich.png                Mastrich (Mustard)
    peony.png                   Peony
    nio.png                     Nio (Allister)
    mel.png                     Mel (Melony)
    saverio.png                 Saverio (Avery)

  Brilliant Diamond / Shining Pearl  ->  brilliant-diamond-shining-pearl/   (19)
    barry.png                   Barry
    veit.png                    Veit (Roark)
    mars.png                    Mars
    silvana.png                 Silvana (Gardenia)
    jupiter.png                 Jupiter
    hilda.png                   Hilda (Maylene)
    marinus.png                 Marinus (Crasher Wake)
    lamina.png                  Lamina (Fantina)
    adam.png                    Adam (Byron)
    saturn.png                  Saturn
    frida.png                   Frida (Candice)
    zyrus.png                   Zyrus (Cyrus)
    mars-jupiter.png            Mars & Jupiter
    volkner.png                 Volkner
    herbaro.png                 Herbaro (Aaron)
    teresa.png                  Teresa (Bertha)
    ignaz.png                   Ignaz (Flint)
    lucian.png                  Lucian
    cynthia.png                 Cynthia

  Scarlet / Violet  ->  scarlet-violet/   (26)
    nemila.png                  Nemila (Nemona)   *
    ronah.png                   Ronah (Katy)
    stony-cliff-titan.png       Stony Cliff Titan   *
    colzo.png                   Colzo (Brassius)
    open-sky-titan.png          Open Sky Titan   *
    pinio.png                   Pinio (Giacomo)
    enigmara.png                Enigmara (Iono)
    irsa.png                    Irsa (Mela)
    lurking-steel-titan.png     Lurking Steel Titan   *
    kombu.png                   Kombu (Kofu)
    shugi.png                   Shugi (Atticus)
    aoki.png                    Aoki (Larry)
    etta.png                    Etta (Ryme)
    quaking-earth-titan.png     Quaking Earth Titan   *
    tulia.png                   Tulia (Tulip)
    grusha.png                  Grusha
    otis.png                    Otis (Ortega)
    false-dragon-titan.png      False Dragon Titan   *
    rioba.png                   Rioba (Eri)
    cay.png                     Cay (Rika)
    poppy.png                   Poppy
    sinius.png                  Sinius (Hassel)
    sagaria.png                 Sagaria (Geeta)
    pepper.png                  Pepper (Arven)   *
    clavel.png                  Clavel (Clive)   *
    cosima.png                  Cosima (Penny)

  Unbound  ->  unbound/   (25)
    rival-axelrod.png           Rival Axelrod   *
    leader-mirskle.png          Leader Mirskle   *
    shadow-admin-marlon-grunt.pngShadow Admin Marlon & Grunt   *
    leader-vega.png             Leader Vega   *
    shadow-admin-ivory.png      Shadow Admin Ivory   *
    shadow-boss-zeph.png        Shadow Boss Zeph   *
    rival-axelford.png          Rival Axelford   *
    leader-alice.png            Leader Alice   *
    leader-mel.png              Leader Mel   *
    shadow-admin-ivory-grunt.pngShadow Admin Ivory & Grunt   *
    successor-maxima.png        Successor Maxima   *
    shadow-admin-marlon.png     Shadow Admin Marlon   *
    leader-galavan.png          Leader Galavan   *
    ruin-agent-vega-grunt.png   Ruin Agent Vega & Grunt   *
    ruin-leader-aklove.png      Ruin Leader Aklove   *
    leader-big-mo.png           Leader Big Mo   *
    leader-tessy.png            Leader Tessy   *
    ruin-admin-ivory.png        Ruin Admin Ivory   *
    ex-shadow-admin-marlon.png  Ex-Shadow Admin Marlon   *
    leader-benjamin.png         Leader Benjamin   *
    moleman.png                 Moleman   *
    elias.png                   Elias   *
    arabella.png                Arabella   *
    penny.png                   Penny
    jax.png                     Jax   *

Generated by scripts/generate-trainer-readme.mjs (npm run generate:trainer-readme).
