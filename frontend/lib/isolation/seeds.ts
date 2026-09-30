// SAMPLE DATA. Village names, populations and positions are placeholders for the
// prototype. Replace with the Census village directory and surveyed road links.
//
// Each row: name, district, state, population, road, position along the road (0 to 1),
// spur length from the road in km, then an optional alternative link (hub id, km).

export const ROAD = {
  guwahatiShillong: "guwahati-silchar:guwahati-shillong",
  shillongJowai: "guwahati-silchar:shillong-jowai",
  jowaiBadarpur: "guwahati-silchar:jowai-badarpur",
  badarpurSilchar: "guwahati-silchar:badarpur-silchar",
  shillongTura: "shillong-tura:shillong-tura",
  guwahatiDimapur: "guwahati-kohima:guwahati-dimapur",
  dimapurKohima: "guwahati-kohima:dimapur-kohima",
  kohimaImphal: "kohima-imphal:kohima-imphal",
  silcharJiribam: "silchar-imphal:silchar-jiribam",
  jiribamImphal: "silchar-imphal:jiribam-imphal",
  silcharAizawl: "silchar-aizawl:silchar-aizawl",
  silcharAgartala: "silchar-agartala:silchar-agartala",
  guwahatiTezpur: "guwahati-itanagar:guwahati-tezpur",
  tezpurItanagar: "guwahati-itanagar:tezpur-itanagar",
  guwahatiJorhat: "guwahati-dibrugarh:guwahati-jorhat",
  jorhatDibrugarh: "guwahati-dibrugarh:jorhat-dibrugarh",
  guwahatiSiliguri: "guwahati-siliguri:guwahati-siliguri",
  siliguriGangtok: "siliguri-gangtok:siliguri-gangtok",
} as const;

export type SeedRow = [
  string,
  string,
  string,
  number,
  string,
  number,
  number,
  [string, number]?,
];

const R = ROAD;

export const VILLAGE_SEEDS: SeedRow[] = [
  // Guwahati to Shillong
  ["Sonapur", "Kamrup", "Assam", 3200, R.guwahatiShillong, 0.12, 2],
  ["Byrnihat", "Ri Bhoi", "Meghalaya", 5200, R.guwahatiShillong, 0.32, 3, ["guwahati", 26]],
  ["Nongpoh", "Ri Bhoi", "Meghalaya", 4300, R.guwahatiShillong, 0.5, 2],
  ["Umsning", "Ri Bhoi", "Meghalaya", 2800, R.guwahatiShillong, 0.68, 4, ["shillong", 22]],
  ["Barapani", "Ri Bhoi", "Meghalaya", 1900, R.guwahatiShillong, 0.85, 3],
  // Shillong to Jowai
  ["Mawkynrew", "East Khasi Hills", "Meghalaya", 2600, R.shillongJowai, 0.25, 5],
  ["Sutnga", "West Jaintia Hills", "Meghalaya", 2100, R.shillongJowai, 0.6, 4, ["jowai", 10]],
  ["Shangpung", "West Jaintia Hills", "Meghalaya", 1500, R.shillongJowai, 0.8, 6],
  // Jowai to Badarpur
  ["Lumshnong", "East Jaintia Hills", "Meghalaya", 3400, R.jowaiBadarpur, 0.3, 3],
  ["Khliehriat", "East Jaintia Hills", "Meghalaya", 4600, R.jowaiBadarpur, 0.45, 2, ["jowai", 40]],
  ["Umkiang", "East Jaintia Hills", "Meghalaya", 900, R.jowaiBadarpur, 0.65, 7],
  ["Jarain", "East Jaintia Hills", "Meghalaya", 1300, R.jowaiBadarpur, 0.8, 5, ["badarpur", 25]],
  // Badarpur to Silchar
  ["Katigorah", "Cachar", "Assam", 6100, R.badarpurSilchar, 0.6, 2],
  ["Fulertal", "Cachar", "Assam", 3300, R.badarpurSilchar, 0.85, 3],
  // Shillong to Tura
  ["Mairang", "West Khasi Hills", "Meghalaya", 3900, R.shillongTura, 0.12, 3, ["shillong", 40]],
  ["Nongstoin", "West Khasi Hills", "Meghalaya", 4800, R.shillongTura, 0.3, 2],
  ["Williamnagar", "East Garo Hills", "Meghalaya", 5400, R.shillongTura, 0.55, 2],
  ["Rongjeng", "East Garo Hills", "Meghalaya", 2300, R.shillongTura, 0.7, 6],
  ["Dadenggre", "West Garo Hills", "Meghalaya", 2700, R.shillongTura, 0.87, 4, ["tura", 22]],
  // Guwahati to Dimapur
  ["Jagiroad", "Morigaon", "Assam", 5100, R.guwahatiDimapur, 0.2, 2],
  ["Kaliabor", "Nagaon", "Assam", 3800, R.guwahatiDimapur, 0.4, 3],
  ["Doboka", "Hojai", "Assam", 2900, R.guwahatiDimapur, 0.55, 4],
  ["Bokajan", "Karbi Anglong", "Assam", 4200, R.guwahatiDimapur, 0.78, 3, ["dimapur", 35]],
  // Dimapur to Kohima
  ["Chumoukedima", "Chumoukedima", "Nagaland", 4700, R.dimapurKohima, 0.2, 2],
  ["Medziphema", "Dimapur", "Nagaland", 2600, R.dimapurKohima, 0.45, 4, ["dimapur", 18]],
  ["Piphema", "Kohima", "Nagaland", 1800, R.dimapurKohima, 0.7, 5],
  // Kohima to Imphal
  ["Mao", "Senapati", "Manipur", 2400, R.kohimaImphal, 0.22, 5],
  ["Senapati", "Senapati", "Manipur", 3700, R.kohimaImphal, 0.5, 2],
  ["Kangpokpi", "Kangpokpi", "Manipur", 4500, R.kohimaImphal, 0.78, 3, ["imphal", 30]],
  // Silchar to Jiribam
  ["Borkhola", "Cachar", "Assam", 3000, R.silcharJiribam, 0.15, 3],
  ["Lakhipur", "Cachar", "Assam", 3600, R.silcharJiribam, 0.45, 3, ["silchar", 45]],
  ["Jirighat", "Jiribam", "Manipur", 1700, R.silcharJiribam, 0.78, 5],
  // Jiribam to Imphal
  ["Khongsang", "Noney", "Manipur", 1200, R.jiribamImphal, 0.3, 6],
  ["Noney", "Noney", "Manipur", 2200, R.jiribamImphal, 0.55, 4],
  ["Nungba", "Noney", "Manipur", 1500, R.jiribamImphal, 0.78, 5, ["imphal", 55]],
  // Silchar to Aizawl
  ["Dholai", "Cachar", "Assam", 2900, R.silcharAizawl, 0.18, 3],
  ["Vairengte", "Kolasib", "Mizoram", 1800, R.silcharAizawl, 0.5, 5],
  ["Kolasib", "Kolasib", "Mizoram", 6200, R.silcharAizawl, 0.68, 2, ["aizawl", 60]],
  ["Bairabi", "Kolasib", "Mizoram", 2100, R.silcharAizawl, 0.82, 4],
  // Silchar to Agartala
  ["Churaibari", "North Tripura", "Tripura", 2300, R.silcharAgartala, 0.3, 4],
  ["Dharmanagar", "North Tripura", "Tripura", 5900, R.silcharAgartala, 0.42, 2],
  ["Kumarghat", "Unakoti", "Tripura", 3100, R.silcharAgartala, 0.62, 3, ["agartala", 65]],
  ["Teliamura", "Khowai", "Tripura", 4400, R.silcharAgartala, 0.85, 3],
  // Guwahati to Tezpur
  ["Mangaldoi", "Darrang", "Assam", 5600, R.guwahatiTezpur, 0.35, 3],
  ["Dalgaon", "Darrang", "Assam", 2700, R.guwahatiTezpur, 0.55, 4],
  ["Balipara", "Sonitpur", "Assam", 3300, R.guwahatiTezpur, 0.86, 3, ["tezpur", 20]],
  // Tezpur to Itanagar
  ["Gohpur", "Biswanath", "Assam", 3500, R.tezpurItanagar, 0.3, 3],
  ["Harmuti", "Lakhimpur", "Assam", 1500, R.tezpurItanagar, 0.68, 6],
  ["Naharlagun", "Papum Pare", "Arunachal Pradesh", 5000, R.tezpurItanagar, 0.9, 2],
  // Guwahati to Jorhat
  ["Samaguri", "Nagaon", "Assam", 2900, R.guwahatiJorhat, 0.18, 3],
  ["Bokakhat", "Golaghat", "Assam", 4700, R.guwahatiJorhat, 0.62, 2],
  ["Furkating", "Golaghat", "Assam", 2500, R.guwahatiJorhat, 0.85, 4, ["jorhat", 40]],
  // Jorhat to Dibrugarh
  ["Teok", "Jorhat", "Assam", 3600, R.jorhatDibrugarh, 0.2, 3],
  ["Nazira", "Sivasagar", "Assam", 4100, R.jorhatDibrugarh, 0.5, 3],
  ["Moran", "Dibrugarh", "Assam", 3900, R.jorhatDibrugarh, 0.8, 4, ["dibrugarh", 35]],
  // Guwahati to Siliguri
  ["Bijni", "Chirang", "Assam", 2600, R.guwahatiSiliguri, 0.25, 4],
  ["Gauripur", "Dhubri", "Assam", 3300, R.guwahatiSiliguri, 0.42, 3],
  ["Mathabhanga", "Cooch Behar", "West Bengal", 3800, R.guwahatiSiliguri, 0.7, 3],
  ["Falakata", "Alipurduar", "West Bengal", 4200, R.guwahatiSiliguri, 0.85, 3, ["siliguri", 55]],
  // Siliguri to Gangtok
  ["Sevoke", "Darjeeling", "West Bengal", 1700, R.siliguriGangtok, 0.18, 4],
  ["Melli", "South Sikkim", "Sikkim", 1400, R.siliguriGangtok, 0.5, 6],
  ["Rangpo", "East Sikkim", "Sikkim", 3000, R.siliguriGangtok, 0.72, 3],
  ["Singtam", "East Sikkim", "Sikkim", 4200, R.siliguriGangtok, 0.87, 3, ["gangtok", 45]],
];
