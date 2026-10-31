TRAINER AVATARS  (Reise / Journey page)
=======================================

PNGs shown next to each trainer. A missing file just shows an initial-letter
placeholder - never an error. These are NOT in the repo or the Docker image
(copyrighted art).

AUTOMATIC: on first start (Docker / Pinokio / `npm run setup`) the app
downloads every mapped trainer from Pokemon Showdown into the per-game
folders below (scripts/download-trainers.mjs, map in
data/trainer-sprite-sources.json). Only missing files are fetched; set
TRAINER_SPRITES=off to skip it.

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
  The slug always uses the GERMAN name, whatever UI language is set.

trainerSet SUBFOLDERS (one per game; HeartGold + SoulSilver share one, since
their trainers are identical):
  red-blue/   gold-silver/   firered/   emerald/   platinum/   heartgold-soulsilver/
  black-white/   infinite-fusion/   (Black + White share one, so do Classic + Remix)

NOTE ON THE RIVAL: every game calls its rival "Rivale" -> slug "rivale", but
it is a DIFFERENT character/look per game. Give each its own file:
  red-blue/rivale.png  gold-silver/rivale.png  emerald/rivale.png
  platinum/rivale.png  heartgold-soulsilver/rivale.png
(FireRed/LeafGreen reuse the champion art for the rival -> firered uses champ.png.)
Recurring gym leaders/Elite Four (Rocko, Misty, ...) are the same person across
games: one file in the root is enough, unless you want generation-accurate art
- then drop a per-game copy in that game folder.

BY GAME - folder, then every trainer in journey order (105 distinct slugs).
A name listed under several games can live once in the root instead.
Infinite Fusion uses English names, so its slugs are English (brock.png ...).

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

  FireRed / LeafGreen  ->  firered/   (13)
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

  Emerald  ->  emerald/   (22)
    rivale.png                  Rivale (Rival)
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

  Platinum  ->  platinum/   (19)
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

  HeartGold / SoulSilver  ->  heartgold-soulsilver/   (31)
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

  Black / White  ->  black-white/   (18)
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

  Infinite Fusion (Classic + Remix)  ->  infinite-fusion/   (21)
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
