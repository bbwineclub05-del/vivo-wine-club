-- ─────────────────────────────────────────────────────────────────────
-- Le cantine di Bolgheri, finite.
--
-- Le visite dell'estate hanno creato otto cantine senza logo, senza
-- scheda e, sei su otto, senza regione: sulla card restava solo il
-- nome. Qui prendono il logo, una descrizione scritta solo con quello
-- che dicono i siti ufficiali, la regione e la riga di classificazione
-- nello stesso formato delle altre.
--
-- Ogni update tocca un campo solo se è ancora vuoto, o solo se vale
-- ancora il valore sbagliato che si vuole correggere: quello che è già
-- stato scritto a mano dall'area riservata non si sovrascrive.
--
-- I loghi stanno in public/wineries/: questa migrazione va eseguita
-- dopo il deploy che li pubblica, altrimenti le card mostrano
-- un'immagine rotta.
-- ─────────────────────────────────────────────────────────────────────

begin;

-- ── 1. Via il prefisso dal nome ──
update wineries set name = 'Grattamacco'        where slug = 'wine-visit-grattamacco-aug-2026'        and name = 'Wine Visit - Grattamacco';
update wineries set name = 'Ornellaia'          where slug = 'wine-visit-ornellaia-aug-2026'          and name = 'Wine Visit - Ornellaia';
update wineries set name = 'Campo alla Sughera' where slug = 'wine-visit-campo-alla-sughera-aug-2026' and name = 'Wine Visit - Campo alla Sughera';

-- ── 2. Loghi ──
update wineries set logo_url = '/wineries/grattamacco.png'        where slug = 'wine-visit-grattamacco-aug-2026'        and coalesce(logo_url, '') = '';
update wineries set logo_url = '/wineries/campo-alla-sughera.png' where slug = 'wine-visit-campo-alla-sughera-aug-2026' and coalesce(logo_url, '') = '';
update wineries set logo_url = '/wineries/ornellaia.png'          where slug = 'wine-visit-ornellaia-aug-2026'          and coalesce(logo_url, '') = '';
update wineries set logo_url = '/wineries/argentiera.png'         where slug = 'wine-visit-argentiera-jul-2026'         and coalesce(logo_url, '') = '';
update wineries set logo_url = '/wineries/tenuta-meraviglia.jpg'  where slug = 'wine-visit-tenuta-meraviglia-jul-2026'  and coalesce(logo_url, '') = '';
update wineries set logo_url = '/wineries/tenuta-fratini.png'     where slug = 'wine-visit-tenuta-fratini-jul-2026'     and coalesce(logo_url, '') = '';
update wineries set logo_url = '/wineries/campo-alle-comete.png'  where slug = 'wine-visit-campo-alle-comete-jun-2026'  and coalesce(logo_url, '') = '';

-- Sassicaia aveva un link di Google Maps al posto del logo: si
-- sostituisce solo se è ancora quello.
update wineries set logo_url = '/wineries/sassicaia.jpg'
 where slug = 'wine-visit-sassicaia-jul-2026'
   and logo_url = 'https://maps.app.goo.gl/LsbNYYotunFVYiEj9';

-- ── 3. Regione e paese ──
update wineries set region = 'Bolgheri'
 where slug in ('wine-visit-grattamacco-aug-2026', 'wine-visit-campo-alla-sughera-aug-2026',
                'wine-visit-ornellaia-aug-2026', 'wine-visit-argentiera-jul-2026',
                'wine-visit-tenuta-meraviglia-jul-2026', 'wine-visit-tenuta-fratini-jul-2026')
   and coalesce(region, '') = '';

update wineries set country = 'Italy'
 where slug in ('wine-visit-grattamacco-aug-2026', 'wine-visit-campo-alla-sughera-aug-2026',
                'wine-visit-ornellaia-aug-2026', 'wine-visit-argentiera-jul-2026',
                'wine-visit-tenuta-meraviglia-jul-2026', 'wine-visit-tenuta-fratini-jul-2026')
   and coalesce(country, '') = '';

-- Il paese si scrive in inglese, come nelle altre: "Italia" e
-- "Italy " (con lo spazio) si correggono solo se sono ancora così.
update wineries set country = 'Italy' where slug = 'wine-visit-sassicaia-jul-2026'    and country = 'Italia';
update wineries set country = 'Italy' where slug = 'wine-visit-san-leonardo-jun-2026' and country = 'Italy ';

-- ── 4. Classificazione ──
-- Ornellaia, Sassicaia e San Leonardo restano vuote: le pagine
-- ufficiali lette non dicono la denominazione o il comune.
update wineries set classification = 'Bolgheri DOC · Castagneto Carducci'
 where slug in ('wine-visit-grattamacco-aug-2026', 'wine-visit-campo-alla-sughera-aug-2026',
                'wine-visit-argentiera-jul-2026', 'wine-visit-campo-alle-comete-jun-2026')
   and coalesce(classification, '') = '';

update wineries set classification = 'Bolgheri DOC · Donoratico'
 where slug in ('wine-visit-tenuta-meraviglia-jul-2026', 'wine-visit-tenuta-fratini-jul-2026')
   and coalesce(classification, '') = '';

-- ── 5. Descrizioni ──
-- Fonti: grattamacco.it/it/storia e /it/bolgheri
update wineries set description = $$Grattamacco sits on a wooded hilltop between Castagneto Carducci and Bolgheri, looking out over the Tuscan coast. It was the second producer estate to be born in Bolgheri, in 1977, when Piermario Meletti Cavallari took over the farm; its first vintage followed in 1982, and in 1994, after the authors of the appellation rules had met beneath the holm oak of its farmhouse, it became the first winery to bottle a Bolgheri Rosso.

Since 2002 the estate has been led by Claudio Tipa within ColleMassari. Of its 80 hectares, 34 are vineyards of Sangiovese and Vermentino alongside Cabernet Sauvignon, Merlot, Cabernet Franc and Petit Verdot, and with the 2022 vintage its Bolgheri Superiore reached its fortieth harvest.$$
 where slug = 'wine-visit-grattamacco-aug-2026' and coalesce(description, '') = '';

-- Fonte: campoallasughera.com/it/storia
update wineries set description = $$Campo alla Sughera was founded in 1998 by the Knauf family, German entrepreneurs long established in Tuscany, after a geological and soil classification of the land carried out the year before. It lies in the heart of the Bolgheri appellation, beside the Fossa di Bolgheri between sea and hills, on soils of sand and marl; it began with 20 hectares, 16.5 of them planted, and has grown with new plots acquired in 2022 and 2024.

Arnione, its first label in 2001 and the estate's icon, is a Bolgheri Superiore; the range also includes Adèo, the Vermentino Arioso and the Campo alla Sughera Super Tuscan from Petit Verdot and Cabernet Franc. Since 2017 the estate has worked with the oenologist Stéphane Derenoncourt.$$
 where slug = 'wine-visit-campo-alla-sughera-aug-2026' and coalesce(description, '') = '';

-- Fonti: ornellaia.com/it/storia-e-proprieta e home page
update wineries set description = $$Ornellaia is owned by the Frescobaldi family, winemakers for seven hundred years. Marchese Ferdinando Frescobaldi is its President and leads the estate alongside Marchese Lamberto Frescobaldi. Its vines grow on the Bolgheri coast, rooted in deep soils where the sea once lay, and the estate sees its style in the meeting of terroir and free thinking: soil, sun, sea and wind.

Beyond the flagship Ornellaia, the estate produces Le Serre Nuove dell'Ornellaia, described as Italy's first second wine, and Ornellaia Bianco, and runs the Vendemmia d'Artista artist-label project. In 2017 it opened its Historical Archive.$$
 where slug = 'wine-visit-ornellaia-aug-2026' and coalesce(description, '') = '';

-- Fonti: argentiera.eu/it/la-tenuta e /it/i-vini
update wineries set description = $$Tenuta Argentiera lies at the southern tip of Castagneto Carducci, the cradle of the Bolgheri DOC. The estate covers 153 hectares, 85 of them under vine, divided into four distinct vineyard areas that sit at some of the highest elevations in the appellation and are laid out as an amphitheatre to catch the light reflected from the sea.

The range is led by Argentiera Bolgheri Superiore, alongside Villa Donoratico Bolgheri Rosso, Ventaglio, Scenario Bolgheri Bianco and Eco di Mare, the estate's own interpretation of Tuscan Vermentino.$$
 where slug = 'wine-visit-argentiera-jul-2026' and coalesce(description, '') = '';

-- Fonte: tenutameraviglia.com/it/home
update wineries set description = $$Tenuta Meraviglia is the only Bolgheri estate to rely solely on Cabernet Franc as its red grape, grown on volcanic soils formed by the rocks known as the Vulcaniti di San Vincenzo. It belongs to the same group as Dievole in Chianti Classico, Poggio Landi and Podere Brizio in Montalcino and Tenuta Le Colonne in Bolgheri.

The range includes Botro dei Fichi, a Bolgheri Rosso, the Bolgheri Superiore Maestro di Cava and Vigna Pianali, from a single parcel. Since September 2025 the wines have been made at Cantina Meraviglia, the new home shared with Tenuta Le Colonne.$$
 where slug = 'wine-visit-tenuta-meraviglia-jul-2026' and coalesce(description, '') = '';

-- Fonte: tenutasanguido.com/storia
update wineries set description = $$Sassicaia is the wine of Tenuta San Guido, a 2,500-hectare property in the Maremma that stretches for 13 kilometres from the hills to the sea. In 1944 Marchese Mario Incisa della Rocchetta planted just over one hectare of Cabernet Sauvignon at Castiglioncello di Bolgheri, some 400 metres above sea level, on stony soils he likened to those of the Graves in Bordeaux.

From 1945 to 1967 Sassicaia remained a strictly private wine, kept for family and friends; 1968 was the first vintage to reach the market. Marchese Mario's son, Nicolò Incisa della Rocchetta, who worked alongside him in running the estate, is today its Honorary President.$$
 where slug = 'wine-visit-sassicaia-jul-2026' and coalesce(description, '') = '';

-- Fonte: tenutafratini.com
update wineries set description = $$Tenuta Fratini was founded in 2016 in the Bolgheri DOC area, at Donoratico, inspired, in its own words, by a deep love for this land. Before planting, the soils were mapped with advanced electromagnetic analyses to identify the best exposures.

Its wines are Hortense, Harte and Clinio, made in a cellar where temperature and humidity are constantly monitored to protect the quality of the grapes.$$
 where slug = 'wine-visit-tenuta-fratini-jul-2026' and coalesce(description, '') = '';

-- Fonte: feudi.com/brands/campo-alle-comete
update wineries set description = $$Campo alle Comete is housed in an early twentieth-century villa in the heart of Bolgheri, in the municipality of Castagneto Carducci, and is one of the estates of the Feudi di San Gregorio group. It works 27 hectares of vineyards planted to Merlot, Cabernet Sauvignon, Cabernet Franc, Sauvignon Blanc and Vermentino.

Its top wine, Torre alle Comete Bolgheri Superiore, comes from four hectares of Cabernet Franc, Cabernet Sauvignon and Sauvignon Blanc beneath the Torre di Donoratico. Every label in the range, from Stupore Bolgheri Rosso to Strabilio Bolgheri Bianco and Albablu Vermentino, is taken from a single painting by the illustrator Nicoletta Ceccoli.$$
 where slug = 'wine-visit-campo-alle-comete-jun-2026' and coalesce(description, '') = '';

-- Fonti: sanleonardo.it/la-storia e /la-tenuta
update wineries set description = $$Tenuta San Leonardo lies at Avio, in Trentino, on the left bank of the Adige, sheltered by the mountains while the valley floor enjoys the mild influence of Lake Garda. More than a thousand years ago it was a monastery; for over three centuries it has been the home of the Marchesi Guerrieri Gonzaga, whose ties to winegrowing here go back to the eighteenth century.

Marchese Carlo Guerrieri Gonzaga, the family's first true oenologist, planted Cabernet Sauvignon and created San Leonardo, a Bordeaux-style blend whose 1988 vintage earned the estate its first Tre Bicchieri. Today the 300-hectare estate is run by his son Anselmo; it has been organic since 2015, and its reds ferment without selected yeasts before ageing for at least 24 months in barrique.$$
 where slug = 'wine-visit-san-leonardo-jun-2026' and coalesce(description, '') = '';

-- ── 6. (Facoltativo, commentato) Sito e indirizzo dai siti ufficiali ──
-- Compaiono nella scheda dell'area soci. Per attivarli togli il "--".
-- update wineries set website = 'https://www.grattamacco.it/'         where slug = 'wine-visit-grattamacco-aug-2026'        and coalesce(website, '') = '';
-- update wineries set website = 'https://www.campoallasughera.com/'   where slug = 'wine-visit-campo-alla-sughera-aug-2026' and coalesce(website, '') = '';
-- update wineries set website = 'https://www.ornellaia.com/'          where slug = 'wine-visit-ornellaia-aug-2026'          and coalesce(website, '') = '';
-- update wineries set website = 'https://www.argentiera.eu/'          where slug = 'wine-visit-argentiera-jul-2026'         and coalesce(website, '') = '';
-- update wineries set website = 'https://tenutameraviglia.com/'       where slug = 'wine-visit-tenuta-meraviglia-jul-2026'  and coalesce(website, '') = '';
-- update wineries set website = 'https://www.tenutasanguido.com/'     where slug = 'wine-visit-sassicaia-jul-2026'          and coalesce(website, '') = '';
-- update wineries set website = 'https://www.tenutafratini.com/'      where slug = 'wine-visit-tenuta-fratini-jul-2026'     and coalesce(website, '') = '';
-- update wineries set website = 'https://feudi.com/brands/campo-alle-comete' where slug = 'wine-visit-campo-alle-comete-jun-2026' and coalesce(website, '') = '';
-- update wineries set website = 'https://www.sanleonardo.it/'         where slug = 'wine-visit-san-leonardo-jun-2026'       and coalesce(website, '') = '';
-- update wineries set address = 'Loc. Lungagnano 128, 57022 Castagneto Carducci (LI)'                     where slug = 'wine-visit-grattamacco-aug-2026'        and coalesce(address, '') = '';
-- update wineries set address = 'Loc. Caccia al Piano 280, 57022 Castagneto Carducci (LI)'                where slug = 'wine-visit-campo-alla-sughera-aug-2026' and coalesce(address, '') = '';
-- update wineries set address = 'Via Aurelia 412/A, Loc. I Pianali, 57022 Castagneto Carducci (LI)'       where slug = 'wine-visit-argentiera-jul-2026'         and coalesce(address, '') = '';
-- update wineries set address = 'Via Vecchia Aurelia 418, Donoratico (LI)'                                where slug = 'wine-visit-tenuta-meraviglia-jul-2026'  and coalesce(address, '') = '';
-- update wineries set address = 'Via Aurelia 398, 57024 Donoratico (LI)'                                  where slug = 'wine-visit-tenuta-fratini-jul-2026'     and coalesce(address, '') = '';
-- update wineries set address = 'Loc. San Leonardo 1, 38063 Avio (TN)'                                    where slug = 'wine-visit-san-leonardo-jun-2026'       and coalesce(address, '') = '';

-- ── 7. Verifica ──
-- Attese: 8 cantine di Bolgheri con logo locale, regione Bolgheri,
-- paese Italy, descrizione piena; classificazione vuota solo per
-- Ornellaia, Sassicaia e San Leonardo.
select slug, name, logo_url, region, country, classification,
       length(description) as car_descrizione
  from wineries
 where slug in ('wine-visit-grattamacco-aug-2026', 'wine-visit-campo-alla-sughera-aug-2026',
                'wine-visit-ornellaia-aug-2026', 'wine-visit-argentiera-jul-2026',
                'wine-visit-tenuta-meraviglia-jul-2026', 'wine-visit-sassicaia-jul-2026',
                'wine-visit-tenuta-fratini-jul-2026', 'wine-visit-campo-alle-comete-jun-2026',
                'wine-visit-san-leonardo-jun-2026')
 order by name;

commit;
