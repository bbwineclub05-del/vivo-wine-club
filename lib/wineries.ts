export interface Winery {
  slug: string;
  name: string;
  logo?: string;
  region: string;
  regionSlug: string;
  country: string;
  classification?: string;   // e.g. "Premier Cru Classé 1855"
  shortDesc: string;
  description: string[];     // paragraphs for the About section
}

export const WINERIES: Winery[] = [

  /* ── BORDEAUX ── */

  {
    slug: 'chateau-latour',
    name: 'Château Latour',
    logo: '/wineries/chateau-latour.webp',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: 'Premier Cru Classé 1855 · Pauillac',
    shortDesc: 'One of the five great First Growths of Bordeaux, producing wines of extraordinary longevity, power and precision from the gravel plateau of Pauillac.',
    description: [
      "One of the five Premiers Crus Classés of the 1855 Classification, Château Latour stands at the southern tip of Pauillac, overlooking the Gironde estuary. Its iconic round tower — the Tour de Saint-Maubert — lends the estate its name and serves as one of Bordeaux's most enduring symbols.",
      "The Grand Vin is renowned for its extraordinary longevity, power, and precision: a wine of near-mythological consistency that has defined the Pauillac style for centuries. The deep gravel soils over iron-rich clay give the wines their characteristic concentration, mineral backbone, and almost indestructible tannic structure.",
      "Since 1993, when it was acquired by François Pinault, Latour has pursued a path of painstaking quality, converting to biodynamic viticulture and — controversially — withdrawing from the en primeur system in 2012 to release wines only when deemed ready to drink.",
    ],
  },

  {
    slug: 'chateau-mouton-rothschild',
    name: 'Château Mouton Rothschild',
    logo: '/wineries/chateau-mouton.jpg',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: 'Premier Cru Classé 1855 · Pauillac',
    shortDesc: 'The only estate ever reclassified in the 1855 hierarchy, elevated to First Growth in 1973. Famous for its commissioned artist labels and opulent Cabernet Sauvignon.',
    description: [
      "The only estate ever to be reclassified in the 1855 hierarchy — elevated from Second to First Growth in 1973 after decades of campaigning by Baron Philippe de Rothschild — Château Mouton Rothschild is as much a cultural institution as a wine estate.",
      "Its labels, which since 1945 have featured commissioned artworks by figures including Picasso, Warhol, Hirst, Chagall, and Bacon, are collected as seriously as the wine itself. The Grand Vin is a Cabernet Sauvignon-dominant blend from the deep gravel soils of Pauillac, producing wines of flamboyant richness, cedary complexity, and remarkable age-worthiness.",
      "The estate also houses an extraordinary museum of art relating to wine — one of the finest in the world — open to visitors who make the pilgrimage to this storied Médoc hill.",
    ],
  },

  {
    slug: 'chateau-margaux',
    name: 'Château Margaux',
    logo: '/wineries/chateau-margaux.png',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: 'Premier Cru Classé 1855 · Margaux',
    shortDesc: 'The most southerly of the Médoc First Growths. Margaux produces wine of ethereal perfume and silky texture — arguably the most elegant in all of Bordeaux.',
    description: [
      "The most southerly of the Médoc Premiers Crus, Château Margaux sits in the appellation that bears its name and produces what many consider the most perfumed, elegant wines in all of Bordeaux. The 18th-century neoclassical château — modelled on a Palladian villa — is among the most photographed in France.",
      "Cabernet Sauvignon dominates the Grand Vin blend, yielding wines of extraordinary finesse: silk-textured, violet-scented, and capable of evolving over 50 years. The second wine, Pavillon Rouge, and the rare Pavillon Blanc — produced from 100% Sauvignon Blanc — complete the range.",
      "Under the ownership of the Mentzelopoulos family since 1977 and the direction of Paul Pontallier until his death in 2016, Margaux underwent one of Bordeaux's most celebrated revivals. Philippa Pontallier continues this legacy with the same rigour and precision.",
    ],
  },

  {
    slug: 'chateau-mission-haut-brion',
    name: 'Château Mission Haut-Brion',
    logo: '/wineries/chateau-la-mission.webp',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: 'Grand Cru Classé de Graves · Pessac-Léognan',
    shortDesc: 'The great rival estate of Haut-Brion, separated by a road. Produces wines of exceptional power, iron-mineral depth and concentration from Pessac-Léognan.',
    description: [
      "Separated from Haut-Brion by nothing more than a road, La Mission Haut-Brion is the great rival estate of Pessac-Léognan, producing wines of exceptional power, minerality and concentration from the same distinctive gravel and clay soils that define the southern Graves.",
      "Acquired by the Dillon family — owners of Haut-Brion — in 1983, the estate has produced some of the most sought-after bottles of the last four decades. The Grand Vin blends Cabernet Sauvignon, Merlot and Cabernet Franc in proportions that vary by vintage, consistently delivering wines of uncommon depth.",
      "A particular iron-mineral character — some describe it as 'graphite over dark fruit' — is unique to this corner of Pessac and gives La Mission wines an unmistakable identity that is the equal of any classified estate in Bordeaux.",
    ],
  },

  {
    slug: 'chateau-lynch-bages',
    name: 'Château Lynch-Bages',
    logo: '/wineries/lynch-bages.png',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: '5ème Cru Classé 1855 · Pauillac',
    shortDesc: 'Nicknamed "the poor man\'s Mouton", Lynch-Bages has long punched far above its Fifth Growth classification with exuberant blackcurrant fruit and generous Pauillac power.',
    description: [
      "Technically a Fifth Growth in the 1855 Classification, Château Lynch-Bages has long punched far above its classification, earning the affectionate nickname 'the poor man's Mouton' for its combination of Pauillac power and relative accessibility.",
      "The estate is owned by the Cazes family, who have farmed it since 1934, and its wines — dominated by Cabernet Sauvignon from the plateau of Bages — are renowned for their exuberant blackcurrant fruit, cedar spice, and generous texture that makes them approachable far earlier than most Pauillac peers.",
      "Lynch-Bages is one of the most commercially successful châteaux in the Médoc, beloved by wine lovers worldwide for delivering First Growth quality at a fraction of the price. The village of Bages, revitalised by the Cazes family, has also become one of the Médoc's most charming destinations.",
    ],
  },

  {
    slug: 'chateau-leoville-poyferre',
    name: 'Château Léoville Poyferré',
    logo: '/wineries/leoville-poyferré.jpg',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: '2ème Cru Classé 1855 · Saint-Julien',
    shortDesc: 'The most opulent of the three Léoville estates. Under Didier Cuvelier\'s direction, Poyferré has been transformed into a near-First Growth quality producer.',
    description: [
      "One of three Léoville estates carved from the original Saint-Julien domaine — alongside Léoville Las Cases and Léoville Barton — Poyferré is the most opulent and modern of the trio.",
      "Under the direction of Didier Cuvelier since the 1990s, the estate has undergone a remarkable transformation: the Grand Vin regularly outperforms its Second Growth classification and has drawn comparisons to the First Growths in exceptional vintages. Rich, full-bodied, and deeply aromatic, it combines the elegance typical of Saint-Julien with a plushness of texture that has made it one of the most sought-after second wines in the Médoc.",
      "The oenologist Michel Rolland has collaborated on the winemaking, and the influence shows: Léoville Poyferré is a wine that unites classical Saint-Julien structure with modern vinification precision — a combination that has won it enormous critical acclaim.",
    ],
  },

  {
    slug: 'chateau-pavie-macquin',
    name: 'Château Pavie Macquin',
    logo: '/wineries/chateau-pavie-macquin.png',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: 'Premier Grand Cru Classé B · Saint-Émilion',
    shortDesc: 'A biodynamically farmed Premier Grand Cru Classé B of Saint-Émilion, producing mineral, structured Merlot-dominant wines from the limestone plateau east of the village.',
    description: [
      "A Premier Grand Cru Classé B of Saint-Émilion, Château Pavie Macquin takes its name from Albert Macquin, the 19th-century viticulturist who helped replant Bordeaux's vineyards after phylloxera devastated the region. The estate sits on the limestone plateau to the east of Saint-Émilion village, adjacent to the more famous Château Pavie.",
      "Managed biodynamically since 1990 under the guidance of Nicolas Thienpont and oenologist Stéphane Derenoncourt, the wines are Merlot-dominant with a distinctive mineral tension from the clay-limestone soils: concentrated, structured, and built to age for two decades or more.",
      "The biodynamic conversion — among the earliest in Saint-Émilion for an estate of this classification — has given the wines a purity and terroir transparency that sets them apart from many neighbours. Pavie Macquin is widely regarded as one of the most authentic expressions of the Saint-Émilion limestone plateau.",
    ],
  },

  {
    slug: 'chateau-montrose',
    name: 'Château Montrose',
    logo: '/wineries/chateau-montrose.jpg',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: '2ème Cru Classé 1855 · Saint-Estèphe',
    shortDesc: 'One of the most powerful and structured wines in Bordeaux. Montrose produces legendary long-lived reds from the heather-covered hill overlooking the Gironde in Saint-Estèphe.',
    description: [
      "One of the most powerful and structured wines in Bordeaux, Château Montrose is a Second Growth estate in the Saint-Estèphe appellation, known for producing long-lived wines of exceptional tannic backbone and mineral depth. The estate takes its name from the heather-covered hill (mont rose) that gives it a uniquely sheltered microclimate and proximity to the Gironde.",
      "Under the ownership of the Bouygues brothers since 2006, Montrose has invested heavily in its cellars and vineyards. Recent vintages — including the celebrated 2009 and 2010 — are ranked among the finest wines ever produced in Saint-Estèphe and have elevated the estate's reputation to near-First Growth status.",
      "The wines are characterised by their imposing structure and remarkable longevity: Montrose at 10 years old is often still a teenager, requiring another decade to reveal its full complexity. It is a wine for patient collectors and a benchmark for the power-with-finesse style of the northern Médoc.",
    ],
  },

  {
    slug: 'cos-destournel',
    name: "Cos d'Estournel",
    logo: "/wineries/cos-d'estournel.png",
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: '2ème Cru Classé 1855 · Saint-Estèphe',
    shortDesc: 'The most architecturally flamboyant estate in Bordeaux, with Indian-inspired pagoda towers. Cos produces Merlot-influenced wines of exotic spice and silky texture that challenge the Saint-Estèphe stereotype.',
    description: [
      "The most architecturally flamboyant estate in Bordeaux, Cos d'Estournel is instantly recognisable for its Indian-inspired pagoda towers — built to reflect the oriental obsessions of its founder, Louis-Gaspard d'Estournel, in the early 19th century. The name 'Cos' (from Gascon for 'hill of pebbles') gives a clue to the terroir: deep gravel over clay on a prominent knoll.",
      "A Second Growth from Saint-Estèphe, Cos produces wines that challenge the regional stereotype: rather than the typical Saint-Estèphe austerity, Cos is known for its Merlot-influenced richness, exotic spice, and silky texture that make it one of the most hedonistic wines in the Médoc.",
      "Since 2004, under the ownership of Michel Reybier, the estate has risen to near-First Growth status in quality. The 2005 and 2009 vintages are frequently cited among the best wines of their respective decades, and a portion of the production is now aged in amphora, adding another dimension of terroir expression.",
    ],
  },

  {
    slug: 'ducru-beaucaillou',
    name: 'Ducru-Beaucaillou',
    logo: '/wineries/ducru-beaucaillou.webp',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: '2ème Cru Classé 1855 · Saint-Julien',
    shortDesc: '"Beautiful pebbles" — Ducru is the classical benchmark of Saint-Julien: cedar-spiced, elegant, and extraordinarily age-worthy from the deep gravel plateau of the Médoc.',
    description: [
      "The name — 'beautiful pebbles' — refers to the distinctive deep gravel soils of the Saint-Julien plateau on which this Second Growth estate stands. Ducru-Beaucaillou is one of Bordeaux's most classical estates: understated in its presentation, rigorous in its winemaking, and producing wines of exceptional elegance and extraordinary longevity.",
      "The château itself — a 19th-century manor overlooking the Gironde — is among the most handsome in the Médoc. Under Bruno Borie's stewardship, Ducru has cemented its status as the reference point for Saint-Julien, consistently producing wines that outperform their Second Growth classification and rival the First Growths in the greatest vintages.",
      "The Grand Vin is characterised by its signature cedar-spice complexity, pencil shaving elegance, and a structured finesse that demands patience. Ducru at 15 years old begins to show its full character; at 25, it can be among the most profound wines in Bordeaux.",
    ],
  },

  {
    slug: 'pontet-canet',
    name: 'Pontet-Canet',
    logo: '/wineries/pontet-canet.jpeg',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: '5ème Cru Classé 1855 · Pauillac',
    shortDesc: 'The biodynamic pioneer of the Médoc. Pontet-Canet has reinvented itself entirely, earning 100-point scores and near-First Growth status from its Fifth Growth classification.',
    description: [
      "One of the most dynamic estates in Bordeaux, Château Pontet-Canet is a Fifth Growth Pauillac that has reinvented itself entirely under the Tesseron family. The estate converted to biodynamic viticulture in the early 2000s — a radical step for a Médoc estate of this scale — and the results have been transformative.",
      "Horse-drawn ploughs work the deep gravel soils; harvesting is entirely by hand; large amphora-like concrete eggs are used for a portion of the élevage alongside traditional barrels. The result is wines of remarkable purity, concentration, and terroir transparency that are now widely regarded as First Growth in quality.",
      "The 2010 vintage, awarded 100 points by Robert Parker, marked Pontet-Canet's arrival at the very summit of Bordeaux. The estate's transformation is now studied as a model of how biodynamic viticulture, applied rigorously at scale, can fundamentally elevate wine quality.",
    ],
  },

  {
    slug: 'haut-bailly',
    name: 'Haut-Bailly',
    logo: '/wineries/haut-bailly.jpeg',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: 'Grand Cru Classé de Graves · Pessac-Léognan',
    shortDesc: 'Uniquely produces only red wine. Known for extraordinary purity of fruit, silky texture and uncommon approachability — one of Pessac-Léognan\'s most elegant estates.',
    description: [
      "Uniquely among the great Pessac-Léognan estates, Château Haut-Bailly produces only red wine — there is no white, only a singular Grand Vin and a second wine. Classified as a Grand Cru Classé de Graves in 1959, the estate has gained enormous prestige under the Wilmers family and their director Véronique Sanders.",
      "The wines are known for their extraordinary purity of fruit, silky texture and uncommon approachability in youth — quite different from the tannic austerity typical of many Pessac estates. Deep sandy gravel soils and a particularly old average vine age give Haut-Bailly wines a rare transparency of terroir.",
      "Under Véronique Sanders's direction since 1998, Haut-Bailly has become one of the most talked-about estates in Bordeaux. The 2020 vintage was awarded 100 points by multiple critics, confirming the estate's position at the very top of the Pessac-Léognan hierarchy.",
    ],
  },

  {
    slug: 'clos-fourtet',
    name: 'Clos Fourtet',
    logo: '/wineries/clos-fourtet.jpg',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: 'Premier Grand Cru Classé B · Saint-Émilion',
    shortDesc: 'At the entrance to the Saint-Émilion village, with cellars carved from living limestone. Clos Fourtet produces wines of remarkable concentration and mineral freshness.',
    description: [
      "Clos Fourtet occupies a privileged position at the very entrance to the Saint-Émilion village, its cellars carved directly into the limestone rock below. A Premier Grand Cru Classé B estate, Clos Fourtet is distinguished by its spectacular network of underground tunnels — some dating to the 18th century — which provide the perfect naturally temperature-controlled environment for barrel ageing.",
      "Since its acquisition by the Cuvelier family in 2001, the estate has been transformed: vine density increased, yields reduced, and winemaking refined to produce wines of remarkable concentration, precision and terroir expression. The Merlot-dominant blend reflects the limestone plateau's influence with wonderful mineral freshness.",
      "The wines combine the richness typical of Saint-Émilion's finest with an earthy, chalky minerality that is the direct expression of the estate's extraordinary geological position: a building literally sitting on top of its own ageing cellars, carved from the same rock that nourishes the vines above.",
    ],
  },

  {
    slug: 'dehours',
    name: 'Dehours',
    logo: '/wineries/dehours.png',
    region: 'Champagne',
    regionSlug: 'champagne',
    country: 'France',
    classification: 'Récoltant-Manipulant · Vallée de la Marne',
    shortDesc: 'A pioneering grower-producer from the Marne Valley championing Meunier as a varietal star. Jérôme Dehours crafts low-dosage, single-plot Champagnes of rare originality.',
    description: [
      "Dehours is a grower-producer (Récoltant-Manipulant) based in Cerseuil, in the Marne Valley west of Épernay. The estate farms around 10 hectares of vines across multiple villages, with Meunier as the dominant variety — a bold commitment to a grape often treated as a blending component rather than a varietal star.",
      "Jérôme Dehours has built an international reputation for single-plot, low-dosage, terroir-expressive Champagnes that challenge the conventions of both grower and grande marque production. His wines are sought after by sommeliers and collectors for their originality, precision, and the way they reveal the specific character of the Vallée de la Marne terroir.",
      "The estate's approach — minimal intervention, long lees ageing, and an insistence on vineyard identity over house style — represents the best of the new wave of grower Champagne. Each cuvée offers a portrait of a specific parcel and vintage, making Dehours's range one of the most compelling and individual in the entire appellation.",
    ],
  },

  {
    slug: 'domaine-de-chevalier',
    name: 'Domaine de Chevalier',
    logo: '/wineries/domaine-de-chevalier.png',
    region: 'Bordeaux',
    regionSlug: 'bordeaux',
    country: 'France',
    classification: 'Grand Cru Classé de Graves · Pessac-Léognan',
    shortDesc: 'One of the greatest estates in Pessac-Léognan for both red and white. The Blanc — aged for decades — is considered one of Bordeaux\'s most profound dry white wines.',
    description: [
      "One of the most prestigious estates in Pessac-Léognan, Domaine de Chevalier produces both red and white wines of outstanding quality from its woodland-encircled vineyard in Léognan. The estate has a quietness and discretion that sets it apart from the more famous châteaux of the Left Bank.",
      "The Blanc — 70% Sauvignon Blanc, 30% Sémillon — is considered one of the greatest dry white wines in Bordeaux, capable of ageing for 20–30 years and developing extraordinary complexity of honey, beeswax, citrus peel, and mineral tension. It is one of the most underrated white wines in the world.",
      "Since its acquisition by the Bernard family in 1983, Domaine de Chevalier has invested continuously in its vineyards and cellar, cementing its status as one of the Left Bank's most reliable and terroir-expressive estates. The red is equally distinguished: more restrained than the Right Bank, more aromatic than northern Médoc, and entirely its own.",
    ],
  },

  /* ── CHAMPAGNE ── */

  {
    slug: 'taittinger',
    name: 'Taittinger',
    logo: '/wineries/taittinger.png',
    region: 'Champagne',
    regionSlug: 'champagne',
    country: 'France',
    classification: 'Grande Marque · Reims',
    shortDesc: 'One of the last great family-owned Champagne houses. Renowned for Chardonnay-forward elegance and the Comtes de Champagne Blanc de Blancs prestige cuvée.',
    description: [
      "One of the last great family-owned Champagne houses, Taittinger was founded in 1932 when Pierre Taittinger acquired the Château de la Marquette and its surrounding vineyards in Reims. The house is renowned for the elegance and Chardonnay-forward style of its wines — a house signature that sets it apart from the more Pinot Noir-driven styles of many rivals.",
      "The Comtes de Champagne Blanc de Blancs, produced only in exceptional vintages entirely from Grand Cru Côte des Blancs Chardonnay, is considered one of the finest prestige cuvées in all of Champagne. Its combination of toasty complexity, vivid acidity, and creamy texture has made it a reference point for Blanc de Blancs worldwide.",
      "The family narrowly avoided losing the house to corporate acquisition in 2005, rallying together to buy back control and preserve the estate's independence. This episode cemented Taittinger's identity as a house defined by family commitment and a singular vision of Champagne as a wine of delicacy, finesse, and time.",
    ],
  },

  /* ── BARBARESCO ── */

  {
    slug: 'gaja',
    name: 'Gaja',
    logo: '/wineries/gaja.webp',
    region: 'Barbaresco',
    regionSlug: 'barbaresco',
    country: 'Italy',
    classification: 'DOCG · Barbaresco & Barolo',
    shortDesc: 'The name that changed Italian wine. Angelo Gaja transformed Barbaresco from a provincial curiosity into a world-class appellation through single-vineyard bottlings and uncompromising quality.',
    description: [
      "Angelo Gaja is arguably the most important figure in modern Italian wine. When he took over the family estate in Barbaresco in 1961, he set out to transform the region from a rural backwater into one of the world's great wine appellations — introducing French oak barriques, single-vineyard bottlings, and uncompromising quality standards that were radical departures from local tradition.",
      "The three legendary single-vineyard wines — Sorì Tildìn, Sorì San Lorenzo, and Costa Russi — are among the most sought-after in Italy. Though controversially declassified to Langhe DOC when small quantities of Cabernet Sauvignon were blended in the 1990s, they remain Barbaresco in spirit, terroir, and soul.",
      "The estate has since expanded to Barolo (Sperss and Conteisa from Serralunga and La Morra), Tuscany's Bolgheri (Ca' Marcanda) and Montalcino (Pieve Santa Restituta). Across every appellation, the Gaja style is unmistakable: wines of extraordinary concentration, aromatic complexity, and the kind of authority that comes from six decades of unbroken commitment to excellence.",
    ],
  },

  {
    slug: 'pellissero',
    name: 'Pellissero',
    logo: undefined,
    region: 'Barbaresco',
    regionSlug: 'barbaresco',
    country: 'Italy',
    classification: 'DOCG · Barbaresco',
    shortDesc: 'A three-generation family estate in Treiso producing terroir-expressive Barbaresco of elegance and depth. The Vanotu single-vineyard is the estate\'s crown jewel.',
    description: [
      "A family estate based in Treiso, one of Barbaresco's three core villages, Pellissero has been producing wines from the Langhe hills for three generations. Under Giorgio Pellissero's direction, the estate has become one of Barbaresco's most reliable and authentic producers.",
      "The wines balance the elegance typical of Treiso — which tends to produce more refined, aromatic Barbaresco than the other two villages — with the classic Nebbiolo character of dried roses, tar, and cherry. Careful viticulture and minimal intervention in the cellar allow the specific character of each vineyard to speak clearly.",
      "The Vanotu single-vineyard Barbaresco, from old vines in the Marcarini cru, is the estate's most celebrated wine: full-bodied, complex, and built for long ageing. Pellissero also produces excellent Dolcetto d'Alba, Barbera d'Asti, and Langhe Nebbiolo that demonstrate the same terroir sensitivity at more accessible price points.",
    ],
  },

  /* ── FRANCIACORTA ── */

  {
    slug: 'ca-del-bosco',
    name: "Ca' del Bosco",
    logo: undefined,
    region: 'Franciacorta',
    regionSlug: 'franciacorta',
    country: 'Italy',
    classification: 'DOCG · Franciacorta',
    shortDesc: 'The estate that put Franciacorta on the global map. Founded by a teenage Maurizio Zanella in 1968, Ca\' del Bosco produces Italy\'s most celebrated sparkling wines.',
    description: [
      "Founded by Maurizio Zanella in 1968 — when Zanella was just 15 years old — Ca' del Bosco is the estate that put Franciacorta on the global wine map. His visits to Champagne in the early 1970s convinced him that the glacial moraine soils and cool lake-influenced climate south of Lake Iseo were capable of producing sparkling wines of international calibre.",
      "Decades of investment in technology, viticulture, and oenology have validated his vision: Ca' del Bosco is now one of Italy's most awarded wine estates. The flagship Annamaria Clementi — named after Zanella's mother and produced from a selection of the estate's finest parcels — has been compared to Krug and Dom Pérignon in blind tastings.",
      "The estate's sprawling parkland, sculpture collection, and architectural winery make it one of the most extraordinary wine destinations in Italy. For Vivo Wine Club, a visit to Ca' del Bosco is not just a wine tasting — it is an immersion in the art, ambition, and sheer elegance that defines Franciacorta at its finest.",
    ],
  },

  {
    slug: 'berlucchi',
    name: 'Berlucchi',
    logo: undefined,
    region: 'Franciacorta',
    regionSlug: 'franciacorta',
    country: 'Italy',
    classification: 'DOCG · Franciacorta',
    shortDesc: 'The founding estate of Franciacorta. In 1961, Franco Ziliani produced the first méthode champenoise sparkling wine in the zone at Palazzo Lana in Borgonato di Corte Franca.',
    description: [
      "Guido Berlucchi & C. holds a unique place in Italian wine history: it was here, in 1961, that enologist Franco Ziliani first produced a méthode champenoise sparkling wine in Franciacorta, effectively founding the appellation. Working from the historic Palazzo Lana in Borgonato di Corte Franca, the estate transformed a then-obscure zone into Italy's foremost sparkling wine region.",
      "Today Berlucchi is the largest producer in the zone and one of the most recognised sparkling wine brands in Italy, with over 500 hectares under vine. The estate's range spans from the entry-level 61 Franciacorta to the prestige Palazzo Lana Extrême, produced only in exceptional vintages from the oldest vines.",
      "Scale has not come at the expense of quality: the wines are consistently fresh, precise, and expressive of Franciacorta's unique terroir. Berlucchi remains the most important symbol of what this zone has become — and of the vision of one man, Franco Ziliani, who believed it could rival Champagne.",
    ],
  },

  {
    slug: 'monterossa',
    name: 'Monterossa',
    logo: undefined,
    region: 'Franciacorta',
    regionSlug: 'franciacorta',
    country: 'Italy',
    classification: 'DOCG · Franciacorta',
    shortDesc: 'One of Franciacorta\'s most dynamic and internationally recognised estates. The Cabochon Brut Millesimato is a perennial award-winner and benchmark for the appellation.',
    description: [
      "One of Franciacorta's most dynamic estates, Monterossa is celebrated for wines of exceptional finesse and consistent international recognition. The Ziliani family, who founded the estate in 1974, have invested heavily in both viticulture and cellar technology over five decades.",
      "The estate's Cabochon Brut Millesimato — a vintage Franciacorta aged for over three years on the lees — is consistently ranked among the finest sparkling wines produced in Italy, having won numerous international awards including the coveted Tre Bicchieri from Gambero Rosso multiple times.",
      "Monterossa's wines are distinguished by their creamy mousse, complex autolytic character, and remarkable freshness from the Lake Iseo influence. The estate's commitment to minimal intervention and long lees ageing produces sparkling wines that develop extraordinary depth and complexity while retaining the vivid freshness that is Franciacorta's calling card.",
    ],
  },

  {
    slug: 'barone-pizzini',
    name: 'Barone Pizzini',
    logo: undefined,
    region: 'Franciacorta',
    regionSlug: 'franciacorta',
    country: 'Italy',
    classification: 'DOCG · Franciacorta — Certified Organic',
    shortDesc: 'The oldest continuously operating estate in Franciacorta, certified organic. Produces precise, mineral, terroir-driven sparkling wines from heritage vineyards in Provaglio d\'Iseo.',
    description: [
      "The oldest continuously operating winery in Franciacorta, Barone Pizzini traces its history to 1870 and the Pizzini family's acquisition of the historic estate in Provaglio d'Iseo. Today, under Silvano Brescianini's direction, the estate is certified organic and is one of the leading advocates for biodynamic viticulture in the appellation.",
      "The wines reflect this philosophy: they are precise, mineral, and terroir-driven, with a restraint and elegance that sets them apart from the more exuberant styles found elsewhere in Franciacorta. The Animante non-millésimé and Bagnadore vintage cuvée are among the most serious and authentic expressions of the appellation.",
      "Barone Pizzini's commitment to organic viticulture — a rarity in an appellation where scale and technical winemaking often dominate — gives the wines a sense of place and integrity that is immediately apparent in the glass. The estate is a reminder that the oldest name in Franciacorta is also, in many ways, one of its most forward-thinking.",
    ],
  },

  {
    slug: 'boccadoro',
    name: 'Boccadoro',
    logo: undefined,
    region: 'Franciacorta',
    regionSlug: 'franciacorta',
    country: 'Italy',
    classification: 'DOCG · Franciacorta',
    shortDesc: 'A boutique artisanal producer in the heart of Franciacorta. Meticulous small-scale production gives the wines a purity and sense of place rarely found in the appellation.',
    description: [
      "A boutique producer in the heart of Franciacorta, Boccadoro represents the artisanal face of an appellation often dominated by larger estates. This small family producer is focused on expressing the nuances of its specific terroir rather than pursuing volume, and the wines reflect that singularity of purpose.",
      "The wines are characterised by freshness, precision, and a delicate mineral quality that reflects the glacial moraine soils of the estate's vineyards. Boccadoro's intimate scale allows for meticulous attention in both vineyard and cellar — each parcel harvested at its precise moment, each wine given the time and care that only small production allows.",
      "For Vivo Wine Club, Boccadoro represents the kind of discovery that makes exploring Franciacorta beyond the famous names so rewarding: a producer whose wines stand entirely on their own terms, offering a portrait of place that no marketing budget can manufacture.",
    ],
  },

  /* ── BAROLO ── */

  {
    slug: 'aldo-conterno',
    name: 'Aldo Conterno',
    logo: undefined,
    region: 'Barolo',
    regionSlug: 'barolo',
    country: 'Italy',
    classification: 'DOCG · Barolo — Bussia, Monforte d\'Alba',
    shortDesc: 'One of the most revered names in Italian wine. Aldo Conterno\'s Bussia estate produces Barolos of extraordinary depth and longevity, including the legendary Gran Bussia Riserva.',
    description: [
      "Among the most revered names in all of Italian wine, Aldo Conterno established his estate in Bussia, Monforte d'Alba in 1969 after breaking away from the family firm Giacomo Conterno. What followed was a career defined by uncompromising quality and a singular commitment to expressing the terroir of the Bussia cru — one of Barolo's most complex and celebrated single-vineyard sites.",
      "Aldo's sons Giacomo, Stefano, and Franco continue his legacy, producing wines of extraordinary depth, power, and longevity. The Gran Bussia Riserva — released only in exceptional years after a minimum of seven years' ageing — is considered one of Italy's greatest wines, a bottle that rewards decades of cellaring.",
      "The estate also produces three single-vineyard Barolos from parcels within the broader Bussia cru — Romirasco, Cicala, and Colonnello — each expressing a distinct facet of this remarkable hillside. Together, they form one of the most compelling exercises in Barolo terroir comparison in the entire zone.",
    ],
  },

  {
    slug: 'clerico',
    name: 'Clerico',
    logo: undefined,
    region: 'Barolo',
    regionSlug: 'barolo',
    country: 'Italy',
    classification: 'DOCG · Barolo — Monforte d\'Alba',
    shortDesc: 'A leading modernist Barolo producer from Monforte d\'Alba. Domenico Clerico pioneered shorter macerations and French oak to create wines of remarkable concentration and early accessibility.',
    description: [
      "Domenico Clerico was one of the 'Barolo Boys' — the modernist producers who transformed Barolo in the 1980s, introducing shorter maceration times, smaller French oak barrels, and more concentrated extraction to create wines that were approachable in youth while retaining Barolo's essential complexity and age-worthiness.",
      "Based in Monforte d'Alba, the estate produces Barolos from a range of prestigious crus — Ciabot Mentin Ginestra, Pajana, and Aeroplanservaj — each reflecting the powerful, mineral character of the Monforte terroir. The wines combine modernist polish with the deep-rooted identity of Nebbiolo from one of the appellation's most demanding sub-zones.",
      "Since Domenico's passing in 2017, the estate has continued under his wife Giuliana Viberti's direction, maintaining the same uncompromising standards that built Clerico's international reputation. The wines remain among the most sought-after in Barolo, prized for their combination of elegance, power, and the unmistakable stamp of Monforte d'Alba.",
    ],
  },

  {
    slug: 'giovanni-rosso',
    name: 'Giovanni Rosso',
    logo: undefined,
    region: 'Barolo',
    regionSlug: 'barolo',
    country: 'Italy',
    classification: 'DOCG · Barolo — Serralunga d\'Alba',
    shortDesc: 'Barolo\'s most exciting rising estate. The Rosso family\'s Vigna Rionda from Serralunga d\'Alba has attracted extraordinary critical acclaim for its iron-mineral complexity and age-worthiness.',
    description: [
      "Giovanni Rosso is one of Barolo's most celebrated rising stars: a family estate in Serralunga d'Alba whose wines have attracted enormous critical acclaim over the past decade. The Rosso family has farmed the steep slopes of Serralunga for generations, and their Barolos reflect the particular character of this privileged sub-zone.",
      "Serralunga produces wines more structured, mineral, and long-lived than those from the Barolo commune's softer soils, with a distinctive iron-earthiness that is the hallmark of this ancient seabed. Davide Rosso's winemaking — precise, respectful of tradition, unafraid of innovation — translates this terroir into bottles of astonishing complexity.",
      "The estate's crown jewel is the Vigna Rionda cru — one of Barolo's most celebrated single vineyards, a steeply sloped south-facing amphitheatre in the heart of Serralunga. From these old vines, Davide produces wines of extraordinary complexity and age-worthiness that are now counted among the finest expressions of Nebbiolo anywhere in Piedmont.",
    ],
  },

  {
    slug: 'luciano-sandrone',
    name: 'Luciano Sandrone',
    logo: '/wineries/luciano-sandrone.avif',
    region: 'Barolo',
    regionSlug: 'barolo',
    country: 'Italy',
    classification: 'DOCG · Barolo — Cannubi, Barolo',
    shortDesc: 'A self-taught legend who started from nothing in 1977. Sandrone\'s Cannubi Boschis — now Aleste — is one of the most elegant and sought-after Barolos in the world.',
    description: [
      "Luciano Sandrone is one of Barolo's most celebrated winemakers, a self-taught vigneron who began his career as a cellar worker at Marchesi di Barolo before establishing his own label in 1977. His first wine — a 1978 Barolo produced from a single barrel — was sold from the back of his car. The contrast with where the estate is today could not be more striking.",
      "The flagship Cannubi Boschis (now renamed Aleste, after his daughter Barbara and nephew Luca) is produced from old vines on the legendary Cannubi hill in the Barolo commune — one of the most celebrated single vineyards in all of Italy. The wines are characterised by extraordinary elegance, aromatic complexity, and a structural finesse that places them among the most sought-after Barolos in the world.",
      "Sandrone was among the first to introduce rigorous green harvesting and cluster selection in the vineyard, and to embrace both traditional large-barrel ageing and modern precision. His career is a testament to the idea that great wine begins in the vineyard — and that passion and rigour, applied without compromise, can build something extraordinary from nothing.",
    ],
  },

];

export function getWineryBySlug(slug: string): Winery | undefined {
  return WINERIES.find((w) => w.slug === slug);
}
