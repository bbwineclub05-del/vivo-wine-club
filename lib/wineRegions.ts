export interface WineRegion {
  id: number;
  slug: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  shortDesc: string;       // 2–3 lines shown in the globe popup
  description: string;     // full paragraph for the /wine-regions/[slug] page
  grapes: string[];        // key grape varieties
  mustTry: string[];       // iconic wines / producers to know
}

export const WINE_REGIONS: WineRegion[] = [
  {
    id: 1,
    slug: 'barolo',
    name: 'Barolo',
    country: 'Italy',
    lat: 44.61,
    lng: 7.93,
    shortDesc:
      'The "King of Italian wines". Barolo produces powerful, tannic Nebbiolo-based reds that age for decades in the rolling hills of Piedmont.',
    description:
      'Barolo is often called the King of Italian wines — a DOCG appellation in the Langhe hills of Piedmont producing some of the most age-worthy reds on earth. Made exclusively from Nebbiolo, the wines are characterised by high tannin, high acidity, and haunting aromas of dried roses, tar, cherry, and leather. The best crus — Cannubi, Brunate, Cerequio, Castiglione Falletto — can age for 30+ years. The zone is divided between traditionalist and modernist producers, creating a rich diversity of styles.',
    grapes: ['Nebbiolo'],
    mustTry: ['Barolo DOCG', 'Barolo Riserva', 'Single-vineyard Cru Barolo'],
  },
  {
    id: 2,
    slug: 'bordeaux',
    name: 'Bordeaux',
    country: 'France',
    lat: 44.84,
    lng: -0.58,
    shortDesc:
      'The world\'s most celebrated wine region. Bordeaux produces iconic Cabernet Sauvignon and Merlot blends from the Left and Right Banks of the Gironde.',
    description:
      'Bordeaux is the reference point for fine wine worldwide. Spanning both banks of the Gironde estuary, it produces legendary blends dominated by Cabernet Sauvignon on the Left Bank (Médoc, Graves) and Merlot on the Right Bank (Saint-Émilion, Pomerol). The 1855 Classification still governs prestige, with estates like Château Lafite, Latour, Margaux, Haut-Brion and Mouton Rothschild commanding extraordinary prices. Dry white wines from Pessac-Léognan and sweet Sauternes complete the picture.',
    grapes: ['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc', 'Sémillon'],
    mustTry: ['Château Margaux', 'Pétrus', 'Château d\'Yquem', 'Lynch-Bages'],
  },
  {
    id: 3,
    slug: 'champagne',
    name: 'Champagne',
    country: 'France',
    lat: 49.05,
    lng: 3.93,
    shortDesc:
      'The birthplace of sparkling wine. Chalky soils and a cool northern climate give Champagne its signature freshness, minerality and elegance.',
    description:
      'Champagne is the only region in the world legally entitled to produce Champagne. Located in northeastern France around Reims and Épernay, its vineyards sit on deep chalk subsoils that drain perfectly and reflect heat onto the vines. The méthode champenoise — secondary fermentation in bottle — creates the iconic bubbles. Blending across villages, vintages and grape varieties (Chardonnay, Pinot Noir, Pinot Meunier) is the art. Grandes Marques like Krug, Dom Pérignon, Salon and Cristal set the benchmark, while Grower Champagnes reveal terroir in an entirely new way.',
    grapes: ['Chardonnay', 'Pinot Noir', 'Pinot Meunier'],
    mustTry: ['Krug Grande Cuvée', 'Dom Pérignon', 'Salon Blanc de Blancs', 'Billecart-Salmon'],
  },
  {
    id: 4,
    slug: 'borgogna',
    name: 'Borgogna',
    country: 'France',
    lat: 47.05,
    lng: 4.85,
    shortDesc:
      'The world\'s most coveted Pinot Noir and Chardonnay. Burgundy\'s concept of terroir — each parcel expressing a unique character — has shaped fine wine culture globally.',
    description:
      'Burgundy is the spiritual home of Pinot Noir and Chardonnay, and no region on earth has done more to define the concept of terroir. The Côte d\'Or — a narrow limestone escarpment running south from Dijon — is divided into thousands of named parcels (lieux-dits and Grands Crus) whose soils, exposures and microclimates create wines of extraordinary individuality. Domaine de la Romanée-Conti, Rousseau, Leroy, Leflaive, Raveneau: these names represent the pinnacle of winemaking. Even modest Bourgogne rouge from a great producer can move you deeply.',
    grapes: ['Pinot Noir', 'Chardonnay', 'Aligoté'],
    mustTry: ['Romanée-Conti', 'La Tâche', 'Montrachet', 'Chambolle-Musigny'],
  },
  {
    id: 5,
    slug: 'barbaresco',
    name: 'Barbaresco',
    country: 'Italy',
    lat: 44.71,
    lng: 8.03,
    shortDesc:
      'Barolo\'s elegant neighbour. Barbaresco is also made from Nebbiolo but grown on sandy soils that yield a more refined, earlier-drinking style.',
    description:
      'Barbaresco is Barolo\'s twin DOCG — both made from Nebbiolo in the Langhe hills of Piedmont, both world-class, both deeply Italian. Yet Barbaresco is often described as more feminine, more approachable in youth, with a silkier texture that comes from its lower altitude and sandier soils. The late Angelo Gaja transformed the appellation from the 1970s onwards, proving it could match Burgundy\'s finest. Key villages include Barbaresco, Treiso and Neive. Crus like Asili, Rabajà, Santo Stefano and Starderi produce wines of astonishing complexity.',
    grapes: ['Nebbiolo'],
    mustTry: ['Gaja Barbaresco', 'Produttori del Barbaresco', 'Bruno Giacosa Asili'],
  },
  {
    id: 6,
    slug: 'franciacorta',
    name: 'Franciacorta',
    country: 'Italy',
    lat: 45.65,
    lng: 10.0,
    shortDesc:
      'Italy\'s answer to Champagne. Franciacorta produces méthode champenoise sparkling wines of exceptional quality near Lake Iseo in Lombardy.',
    description:
      'Franciacorta is the only Italian DOCG for méthode classique sparkling wine — produced, like Champagne, with secondary fermentation in the bottle. Located on the glacial moraine soils south of Lake Iseo in Lombardy, the zone was pioneered by Ca\' del Bosco and Bellavista in the 1970s. Today Franciacorta Satèn (blanc de blancs), Rosé and Riserva wines compete seriously with grower Champagnes. The unique combination of Alpine freshness, lake influence and mineral soils gives Franciacorta its distinctive identity.',
    grapes: ['Chardonnay', 'Pinot Nero', 'Pinot Bianco'],
    mustTry: ['Ca\' del Bosco Annamaria Clementi', 'Bellavista Teatro', 'Berlucchi'],
  },
  {
    id: 7,
    slug: 'chianti',
    name: 'Chianti',
    country: 'Italy',
    lat: 43.45,
    lng: 11.25,
    shortDesc:
      'The heart of Tuscany. Chianti Classico produces Sangiovese wines of remarkable elegance and terroir expression from the hills between Florence and Siena.',
    description:
      'Chianti Classico is the historic heartland between Florence and Siena, where Sangiovese reigns supreme. The Gran Selezione category — introduced in 2014 — has elevated the appellation to new heights, with single-vineyard expressions from producers like Fontodi, Castello di Ama, Isole e Olena, and Antinori pushing Sangiovese to world-class status. Galestro and alberese soils give the wines their characteristic cherry-red fruit, firm acidity and herbal complexity. The black cockerel (Gallo Nero) on the label is the sign of a true Classico.',
    grapes: ['Sangiovese', 'Canaiolo', 'Colorino'],
    mustTry: ['Fontodi Vigna del Sorbo', 'Isole e Olena', 'Castello di Ama L\'Apparita'],
  },
  {
    id: 8,
    slug: 'bolgheri',
    name: 'Bolgheri',
    country: 'Italy',
    lat: 43.17,
    lng: 10.60,
    shortDesc:
      'Home of the Super Tuscans. Bolgheri burst onto the world stage with Sassicaia in 1968 and became the template for Bordeaux-variety winemaking in Italy.',
    description:
      'Bolgheri is a relatively young wine zone on the Tuscan coast that changed Italian wine history forever. Sassicaia, first released commercially in 1968, showed that Cabernet Sauvignon could thrive in Tuscany as well as Bordeaux. Ornellaia followed, then Masseto — now one of Italy\'s most expensive wines — and a slew of "Super Tuscans" that ignored DOC rules to blend international varieties outside tradition. The warm Mediterranean climate, coastal breezes and unique gravelly soils make Bolgheri one of Italy\'s most exciting appellations.',
    grapes: ['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc', 'Petit Verdot'],
    mustTry: ['Sassicaia', 'Ornellaia', 'Masseto', 'Le Macchiole Messorio'],
  },
  {
    id: 9,
    slug: 'montalcino',
    name: 'Montalcino',
    country: 'Italy',
    lat: 43.06,
    lng: 11.49,
    shortDesc:
      'Home of Brunello. Montalcino produces Tuscany\'s most age-worthy red wines from a single clone of Sangiovese grown on a sunbaked hilltop south of Siena.',
    description:
      'Brunello di Montalcino is Italy\'s most prestigious red wine appellation — a DOCG producing Sangiovese Grosso (Brunello) from the hillside town of Montalcino south of Siena. The wines require years of ageing: Brunello must spend at least five years in the cellar before release, Riserva six. The result is extraordinary complexity — dried fruit, tobacco, leather, iron — with an acid-tannin structure that allows the wines to age for 30–50 years. Biondi-Santi created the style in the 19th century; today Soldera, Poggio di Sotto and Canalicchio di Sopra are among the finest producers.',
    grapes: ['Sangiovese Grosso (Brunello)'],
    mustTry: ['Biondi-Santi Brunello', 'Soldera Case Basse', 'Poggio di Sotto', 'Canalicchio di Sopra'],
  },
];

export function getRegionBySlug(slug: string): WineRegion | undefined {
  return WINE_REGIONS.find((r) => r.slug === slug);
}
