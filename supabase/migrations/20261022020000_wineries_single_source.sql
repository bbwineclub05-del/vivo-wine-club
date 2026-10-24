-- ─────────────────────────────────────────────────────────────────────
-- Le cantine, in un posto solo.
--
-- Fino a ieri le schede vivevano in due posti: 34 scritte dentro il
-- codice (lib/wineries.ts) e 43 nel database. Il sito pubblico leggeva
-- prima quelle del codice, quindi tutto ciò che si modificava
-- dall'area riservata — foto, posizione sulla mappa, descrizione —
-- non compariva mai per quelle 34. Due fonti, e quella modificabile
-- perdeva sempre.
--
-- Il database ha già una copia identica di tutte le descrizioni
-- (verificato: 34 su 34) e di tutti i loghi. Mancano solo la
-- classificazione e la riga breve, che stavano solo nel codice.
-- Questa migrazione le porta dentro, e da lì in poi la fonte è una.
-- ─────────────────────────────────────────────────────────────────────

alter table wineries add column if not exists classification     text;
alter table wineries add column if not exists short_description  text;
alter table wineries add column if not exists region_slug        text;

update wineries w
   set classification    = coalesce(w.classification, v.classification),
       short_description = coalesce(w.short_description, v.short_desc),
       region_slug       = coalesce(w.region_slug, v.region_slug)
  from (values
  ('chateau-latour', 'Premier Cru Classé 1855 · Pauillac', 'One of the five great First Growths of Bordeaux, producing wines of extraordinary longevity, power and precision from the gravel plateau of Pauillac.', 'bordeaux'),
  ('chateau-mouton-rothschild', 'Premier Cru Classé 1855 · Pauillac', 'The only estate ever reclassified in the 1855 hierarchy, elevated to First Growth in 1973. Famous for its commissioned artist labels and opulent Cabernet Sauvignon.', 'bordeaux'),
  ('chateau-margaux', 'Premier Cru Classé 1855 · Margaux', 'The most southerly of the Médoc First Growths. Margaux produces wine of ethereal perfume and silky texture — arguably the most elegant in all of Bordeaux.', 'bordeaux'),
  ('chateau-mission-haut-brion', 'Grand Cru Classé de Graves · Pessac-Léognan', 'The great rival estate of Haut-Brion, separated by a road. Produces wines of exceptional power, iron-mineral depth and concentration from Pessac-Léognan.', 'bordeaux'),
  ('chateau-lynch-bages', '5ème Cru Classé 1855 · Pauillac', 'Nicknamed "the poor man''s Mouton", Lynch-Bages has long punched far above its Fifth Growth classification with exuberant blackcurrant fruit and generous Pauillac power.', 'bordeaux'),
  ('chateau-leoville-poyferre', '2ème Cru Classé 1855 · Saint-Julien', 'The most opulent of the three Léoville estates. Under Didier Cuvelier''s direction, Poyferré has been transformed into a near-First Growth quality producer.', 'bordeaux'),
  ('chateau-pavie-macquin', 'Premier Grand Cru Classé B · Saint-Émilion', 'A biodynamically farmed Premier Grand Cru Classé B of Saint-Émilion, producing mineral, structured Merlot-dominant wines from the limestone plateau east of the village.', 'bordeaux'),
  ('chateau-montrose', '2ème Cru Classé 1855 · Saint-Estèphe', 'One of the most powerful and structured wines in Bordeaux. Montrose produces legendary long-lived reds from the heather-covered hill overlooking the Gironde in Saint-Estèphe.', 'bordeaux'),
  ('cos-destournel', '2ème Cru Classé 1855 · Saint-Estèphe', 'The most architecturally flamboyant estate in Bordeaux, with Indian-inspired pagoda towers. Cos produces Merlot-influenced wines of exotic spice and silky texture that challenge the Saint-Estèphe stereotype.', 'bordeaux'),
  ('ducru-beaucaillou', '2ème Cru Classé 1855 · Saint-Julien', '"Beautiful pebbles" — Ducru is the classical benchmark of Saint-Julien: cedar-spiced, elegant, and extraordinarily age-worthy from the deep gravel plateau of the Médoc.', 'bordeaux'),
  ('pontet-canet', '5ème Cru Classé 1855 · Pauillac', 'The biodynamic pioneer of the Médoc. Pontet-Canet has reinvented itself entirely, earning 100-point scores and near-First Growth status from its Fifth Growth classification.', 'bordeaux'),
  ('haut-bailly', 'Grand Cru Classé de Graves · Pessac-Léognan', 'Uniquely produces only red wine. Known for extraordinary purity of fruit, silky texture and uncommon approachability — one of Pessac-Léognan''s most elegant estates.', 'bordeaux'),
  ('clos-fourtet', 'Premier Grand Cru Classé B · Saint-Émilion', 'At the entrance to the Saint-Émilion village, with cellars carved from living limestone. Clos Fourtet produces wines of remarkable concentration and mineral freshness.', 'bordeaux'),
  ('dehours', 'Récoltant-Manipulant · Vallée de la Marne', 'A pioneering grower-producer from the Marne Valley championing Meunier as a varietal star. Jérôme Dehours crafts low-dosage, single-plot Champagnes of rare originality.', 'champagne'),
  ('domaine-de-chevalier', 'Grand Cru Classé de Graves · Pessac-Léognan', 'One of the greatest estates in Pessac-Léognan for both red and white. The Blanc — aged for decades — is considered one of Bordeaux''s most profound dry white wines.', 'bordeaux'),
  ('taittinger', 'Grande Marque · Reims', 'One of the last great family-owned Champagne houses. Renowned for Chardonnay-forward elegance and the Comtes de Champagne Blanc de Blancs prestige cuvée.', 'champagne'),
  ('gaja', 'DOCG · Barbaresco & Barolo', 'The name that changed Italian wine. Angelo Gaja transformed Barbaresco from a provincial curiosity into a world-class appellation through single-vineyard bottlings and uncompromising quality.', 'barbaresco'),
  ('pellissero', 'DOCG · Barbaresco', 'A three-generation family estate in Treiso producing terroir-expressive Barbaresco of elegance and depth. The Vanotu single-vineyard is the estate''s crown jewel.', 'barbaresco'),
  ('ca-del-bosco', 'DOCG · Franciacorta', 'The estate that put Franciacorta on the global map. Founded by a teenage Maurizio Zanella in 1968, Ca'' del Bosco produces Italy''s most celebrated sparkling wines.', 'franciacorta'),
  ('berlucchi', 'DOCG · Franciacorta', 'The founding estate of Franciacorta. In 1961, Franco Ziliani produced the first méthode champenoise sparkling wine in the zone at Palazzo Lana in Borgonato di Corte Franca.', 'franciacorta'),
  ('monterossa', 'DOCG · Franciacorta', 'One of Franciacorta''s most dynamic and internationally recognised estates. The Cabochon Brut Millesimato is a perennial award-winner and benchmark for the appellation.', 'franciacorta'),
  ('barone-pizzini', 'DOCG · Franciacorta — Certified Organic', 'The oldest continuously operating estate in Franciacorta, certified organic. Produces precise, mineral, terroir-driven sparkling wines from heritage vineyards in Provaglio d''Iseo.', 'franciacorta'),
  ('boccadoro', 'DOCG · Franciacorta', 'A boutique artisanal producer in the heart of Franciacorta. Meticulous small-scale production gives the wines a purity and sense of place rarely found in the appellation.', 'franciacorta'),
  ('aldo-conterno', 'DOCG · Barolo — Bussia, Monforte d''Alba', 'One of the most revered names in Italian wine. Aldo Conterno''s Bussia estate produces Barolos of extraordinary depth and longevity, including the legendary Gran Bussia Riserva.', 'barolo'),
  ('clerico', 'DOCG · Barolo — Monforte d''Alba', 'A leading modernist Barolo producer from Monforte d''Alba. Domenico Clerico pioneered shorter macerations and French oak to create wines of remarkable concentration and early accessibility.', 'barolo'),
  ('giovanni-rosso', 'DOCG · Barolo — Serralunga d''Alba', 'Barolo''s most exciting rising estate. The Rosso family''s Vigna Rionda from Serralunga d''Alba has attracted extraordinary critical acclaim for its iron-mineral complexity and age-worthiness.', 'barolo'),
  ('luciano-sandrone', 'DOCG · Barolo — Cannubi, Barolo', 'A self-taught legend who started from nothing in 1977. Sandrone''s Cannubi Boschis — now Aleste — is one of the most elegant and sought-after Barolos in the world.', 'barolo'),
  ('quinta-do-noval', 'Douro DOC · Pinhão', 'One of the Douro''s most iconic estates, famous above all for Nacional — a Vintage Port from ungrafted pre-phylloxera vines that is among the rarest and most sought-after wines on earth.', 'porto'),
  ('grahams', 'Douro DOC · Vila Nova de Gaia', 'One of the great British Port houses, founded in 1820. Graham''s Vintage Port — produced only in the finest years — is among the most consistently celebrated in the world.', 'porto'),
  ('antinori', 'Chianti Classico DOCG · Bargino, Val di Pesa', 'One of Italy''s oldest and most influential wine dynasties, Antinori has shaped Tuscan wine for over six centuries — from Chianti Classico to the birth of the Super Tuscans.', 'chianti'),
  ('quintarelli', 'Valpolicella Classico · Negrar', 'The most mythical name in Valpolicella. Giuseppe Quintarelli elevated Amarone to a work of art through decades of uncompromising craftsmanship and natural winemaking.', 'valpolicella'),
  ('bertani', 'Valpolicella Classico · Grezzana', 'One of the oldest and most historic estates in Valpolicella, Bertani has been defining Amarone since the 1950s with wines built for extraordinary longevity.', 'valpolicella'),
  ('tommasi', 'Valpolicella Classico · San Pietro in Cariano', 'A leading family estate in the heart of the Valpolicella Classico zone, Tommasi produces benchmark Amarone and Ripasso wines across several hundred hectares of estate vineyards.', 'valpolicella'),
  ('speri', 'Valpolicella Classico · Pedemonte', 'A fifth-generation family estate in the Valpolicella Classico zone, Speri produces refined and elegant Amarone and Ripasso wines that consistently rank among the region''s finest.', 'valpolicella')
       ) as v(slug, classification, short_desc, region_slug)
 where w.slug = v.slug;

-- Verifica: atteso 34 con classificazione, 43 cantine in tutto.
select count(*) filter (where classification is not null)    as con_classificazione,
       count(*) filter (where short_description is not null) as con_riga_breve,
       count(*)                                              as cantine
  from wineries;
