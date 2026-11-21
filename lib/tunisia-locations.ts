// Municipalités tunisiennes regroupées par gouvernorat, sans appel réseau au checkout.
// Source : https://fr.wikipedia.org/wiki/Liste_des_municipalit%C3%A9s_de_Tunisie
const villesParGouvernorat: Readonly<Record<string, readonly string[]>> = {
  "Ariana": ["Ariana", "Ettadhamen", "Kalâat el-Andalous", "La Soukra", "Mnihla", "Raoued", "Sidi Thabet"],
  "Béja": ["Amdoun", "Béja", "El Maâgoula", "Goubellat", "Medjez el-Bab", "Nefza", "Ouchtata-Jmila", "Sidi Ismaïl", "Slouguia", "Téboursouk", "Testour", "Thibar"],
  "Ben Arous": ["Ben Arous", "Bou Mhel el-Bassatine", "El Mourouj", "Ezzahra", "Fouchana", "Hammam Chott", "Hammam Lif", "Khalidia", "Mégrine", "Mohamedia", "Mornag", "Naassen", "Radès"],
  "Bizerte": ["Aousja", "Bizerte", "El Alia", "El Hachachna", "Ghar El Melh", "Ghezala", "Joumine", "Mateur", "Menzel Abderrahmane", "Menzel Bourguiba", "Menzel Jemil", "Metline", "Raf Raf", "Ras Jebel", "Sejnane", "Tinja", "Utique"],
  "Gabès": ["Bouchemma", "Chenini Nahal", "Dkhilet Toujane", "El Hamma", "Gabès", "Ghannouch", "Habib Thameur Bouatouch", "Kettana", "Mareth", "Matmata", "Menzel El Habib", "Métouia", "Nouvelle Matmata", "Oudhref", "Teboulbou", "Zarat"],
  "Gafsa": ["Belkhir", "El Guettar", "El Ksar", "Gafsa", "Lela", "Mdhilla", "Métlaoui", "Moularès", "Redeyef", "Sened", "Sidi Aïch", "Sidi Boubaker", "Zannouch"],
  "Jendouba": ["Aïn Draham", "Aïn Sobh-Nadhour", "Balta-Bou Aouane", "Beni M'Tir", "Bou Salem", "Fernana", "Ghardimaou", "Jendouba", "Jouaouda", "Kalaa-Maaden-Farksan", "Khmairia", "Oued Meliz", "Souk Sebt", "Tabarka"],
  "Kairouan": ["Abida", "Aïn Djeloula", "Aïn El Beïdha", "Bou Hajla", "Chaouachi", "Chebika", "Chraitia-Ksour", "Echrarda", "El Alâa", "Haffouz", "Hajeb El Ayoun", "Jhina", "Kairouan", "Menzel Mehiri", "Nasrallah", "Oueslatia", "Raqqada", "Sbikha", "Sisseb-Driaat"],
  "Kasserine": ["Aïn Khmaissia", "Bouzguem", "Chrayaa-Machrek Chams", "El Ayoun", "Ennour", "Ezzouhour", "Fériana", "Foussana", "Haïdra", "Hassi El Ferid", "Jedelienne", "Kasserine", "Khmouda", "Majel Bel Abbès", "Rakhmat", "Sbeïtla", "Sbiba", "Thala", "Thélepte"],
  "Kébili": ["Bechli-Blidet-Jerssin", "Bechri-Fatnassa", "Douz", "El Golâa", "Faouar", "Jemna", "Kébili", "Rjim Maatoug", "Souk Lahad"],
  "Le Kef": ["Bohra", "Dahmani", "El Ksour", "El Marja", "Jérissa", "Kalâat Khasba", "Kalaat Senan", "Le Kef", "Le Sers", "Menzel Salem", "Nebeur", "Sakiet Sidi Youssef", "Tajerouine", "Touiref", "Zaafrana-Dir Kef"],
  "Mahdia": ["Bou Merdes", "Chebba", "Chorbane", "El Bradâa", "El Jem", "Essouassi", "Hebira", "Hkaima", "Kerker", "Ksour Essef", "Mahdia", "Melloulèche", "Ouled Chamekh", "Rejiche", "Sidi Alouane", "Sidi Zid-Awled Moulahem", "Tlelsa", "Zelba"],
  "Manouba": ["Borj El Amri", "Den Den", "Djedeida", "Douar Hicher", "El Bassatine", "El Batan", "La Manouba", "Mornaguia", "Oued Ellil", "Tebourba"],
  "Médenine": ["Ben Gardane", "Beni Khedache", "Boughrara", "Djerba - Ajim", "Djerba - Houmt Souk", "Djerba - Midoun", "Médenine", "Sidi Makhlouf", "Zarzis", "Zarzis Nord"],
  "Monastir": ["Amiret El Fhoul", "Amiret Hajjaj", "Amiret Touazra", "Bekalta", "Bembla-Mnara", "Beni Hassen", "Bennane-Bodheur", "Bouhjar", "Cherahil", "El Ghnada", "El Masdour-Menzel Harb", "Jemmal", "Khniss", "Ksar Hellal", "Ksibet el-Médiouni", "Lamta", "Menzel Ennour", "Menzel Fersi", "Menzel Hayet", "Menzel Kamel", "Moknine", "Monastir", "Ouerdanine", "Sahline Moôtmar", "Sayada", "Sidi Ameur-Mesjed-Aïssa", "Sidi Bennour", "Sidi Jedidi", "Téboulba", "Touza", "Zaouiet Kontoch", "Zéramdine"],
  "Nabeul": ["Azmour", "Béni Khalled", "Béni Khiar", "Bou Argoub", "Chrifet-Boucharray", "Dar Allouch", "Dar Chaâbane", "El Haouaria", "El Maâmoura", "El Mida", "Fondouk Jedid-Seltene", "Grombalia", "Hammam Ghezèze", "Hammamet", "Kélibia", "Korba", "Korbous", "Menzel Bouzelfa", "Menzel Horr", "Menzel Temime", "Nabeul", "Soliman", "Somâa", "Takelsa", "Tazarka", "Tazougrane-Boukrim-Zaouiet El Mgaies", "Zaouiet Djedidi"],
  "Sfax": ["Aachech-Aouadna-Boujarbou-Majel Draj", "Agareb", "Bir Ali Ben Khalifa", "Chihia", "El Aïn", "El Amra", "El Hencha", "Ennasr", "Graïba", "Gremda", "Hadjeb", "Hazeg Ellouza", "Jebiniana", "Kerkennah", "Mahrès", "Menzel Chaker", "Nadhour-Sidi Ali Ben Abed", "Ouabed Khazanet", "Sakiet Eddaïer", "Sakiet Ezzit", "Sfax", "Skhira", "Thyna"],
  "Sidi Bouzid": ["Baten Ghzal", "Bir El Hafey", "Cebbala Ouled Asker", "Essaïda", "Faiedh Bennour", "Jilma", "Lessouda", "Mansoura", "Meknassy", "Menzel Bouzaiane", "Mezzouna", "Ouled Haffouz", "Rahal", "Regueb", "Sidi Ali Ben Aoun", "Sidi Bouzid", "Souk Jedid"],
  "Siliana": ["Bargou", "Bou Arada", "El Aroussa", "El Krib", "Gaâfour", "Hbabsa", "Kesra", "Makthar", "Rouhia", "Sidi Bou Rouis", "Sidi Morched", "Siliana"],
  "Sousse": ["Akouda", "Bouficha", "Chott Meriem", "Enfida", "Ezzouhour", "Grimet-Hicher", "Hammam Sousse", "Hergla", "Kalâa Kebira", "Kalâa Seghira", "Kondar", "Ksibet Thrayet", "M'saken", "Messaadine", "Sidi Bou Ali", "Sidi El Hani", "Sousse", "Zaouiet Sousse"],
  "Tataouine": ["Bir Lahmar", "Dehiba", "Ghomrassen", "Remada", "Smâr", "Tataouine", "Tataouine Sud"],
  "Tozeur": ["Degache", "El Hamma du Jérid", "Hazoua", "Nefta", "Tamerza", "Tozeur"],
  "Tunis": ["Carthage", "La Goulette", "La Marsa", "Le Bardo", "Le Kram", "Sidi Bou Saïd", "Sidi Hassine", "Tunis"],
  "Zaghouan": ["Bir Mcherga", "Djebel Oust", "El Amaiem", "El Fahs", "Nadhour", "Saouaf", "Zaghouan", "Zriba"],
};

export const gouvernorats = Object.keys(villesParGouvernorat);

export function getVilles(gouvernorat: string): readonly string[] {
  return Object.prototype.hasOwnProperty.call(villesParGouvernorat, gouvernorat)
    ? villesParGouvernorat[gouvernorat] : [];
}

export function isValidLocation(gouvernorat: string, ville: string) {
  return getVilles(gouvernorat).includes(ville);
}
