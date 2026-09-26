export type Article = {
  id: string;
  section: 'Animals' | 'History' | 'Science' | 'Travel';
  title: string;
  blurb: string;
  url: string;
};

const BASE = 'https://www.nationalgeographic.com';

const a = (section: Article['section'], path: string, title: string, blurb: string): Article => ({
  id: path,
  section,
  title,
  blurb,
  url: `${BASE}/${section.toLowerCase()}/article/${path}`,
});

/** The National Geographic stories the Explore mode deals out, in order. */
export const ARTICLES: Article[] = [
  a(
    'Animals',
    'marcus-westberg-antelope-south-sudan-land-migration',
    'The first drone footage of Earth’s largest land migration',
    'Six million antelope cross South Sudan’s Great Nile Migration Landscape, from wetlands to dry plains and back.',
  ),
  a(
    'History',
    'byzantine-medieval-shipwreck-croatia',
    'Can this medieval Byzantine shipwreck rewrite history?',
    'Gold belt sets and coins from Constantinople turn up in a wreck off the coast of Croatia.',
  ),
  a(
    'Travel',
    'modernist-architecture-national-parks',
    'Visiting a U.S. national park for the retro architecture',
    'Mission 66 swapped rustic “Parkitecture” for mid-century modern visitor centers.',
  ),
  a(
    'Animals',
    'sperm-whale-birth-video',
    'A sperm whale birth, recorded up close for the first time',
    'Scientists watched a pod help deliver a calf, and saw something extraordinary.',
  ),
  a(
    'Science',
    'how-dinosaur-teeth-traveled',
    'How dinosaur teeth traveled',
    'What fossil teeth reveal about how far the giants roamed.',
  ),
  a(
    'Animals',
    'meet-the-first-new-cat-species-discovered-in-100-years',
    'Meet the first new cat species discovered in 100 years',
    'Leopardus tilcayo, a tiger cat from the forests of Bolivia.',
  ),
  a(
    'History',
    'mars-3d-reconstruction-shipwreck-baltic-sweden-archaeology',
    'The wreck of a 16th-century Swedish warship',
    'The Mars sank in 1564 with more than 100 cannons aboard. Now it’s been rebuilt in 3D.',
  ),
  a(
    'Animals',
    'chimpanzee-war-conflict-animal-societies',
    'Why chimp friends turned into foes in a “civil war”',
    'An unprecedented split tore apart a chimpanzee community in Uganda.',
  ),
  a(
    'Science',
    'where-might-we-find-life-in-our-solar-system',
    'Where might we find life in our solar system?',
    'From icy moons to hidden oceans, the best places to look.',
  ),
  a(
    'Animals',
    'unloved-animals-conservation-population-underdogs',
    'The superpowers of nature’s most unloved animals',
    'Vultures, sloths and slugs have adaptations worth a second look.',
  ),
  a(
    'History',
    'yassi-ada-shipwreck-bodrum-byzantine-turkey',
    'The shipwreck off Bodrum that transformed underwater archaeology',
    'A church-owned ship carrying wine and oil went down in A.D. 626.',
  ),
  a(
    'Travel',
    'beautiful-photos-of-all-us-national-parks',
    'See the beauty of all 63 U.S. national parks',
    'A photo tour of every national park in the country.',
  ),
  a(
    'Science',
    'greenhouse-gases-lurk-in-oceans-could-make-warming-far-worse',
    'Greenhouse gases hidden at the bottom of the oceans',
    'Frozen reservoirs of methane under the seafloor could make warming far worse.',
  ),
  a(
    'Animals',
    'here-are-the-best-wildlife-photos-of-2025',
    'The best wildlife photos of 2025',
    'Jaguars, polar bears, antelope herds and more of the year’s great animal moments.',
  ),
  a(
    'History',
    '110829-blackbeard-shipwreck-pirates-archaeology-science',
    'Blackbeard’s ship confirmed off North Carolina',
    'The wreck is the pirate’s flagship, the Queen Anne’s Revenge.',
  ),
  a(
    'Science',
    'if-alien-life-exists-in-solar-system-may-look-like-this-aurora-hydrothermal-vent',
    'If alien life exists in our solar system, it may look like this',
    'Arctic hydrothermal vents hint at what could live on other worlds.',
  ),
  a(
    'Animals',
    'nocturnal-animals-explained',
    'How nocturnal animals own the night',
    'The adaptations that let animals thrive in the dark.',
  ),
  a(
    'Travel',
    'underrated-road-trips-route-66-alternatives',
    '5 lesser-known U.S. road trips',
    'All the scenery of Route 66, without the congestion.',
  ),
];
