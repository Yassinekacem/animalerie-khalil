"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Bird, BookOpen, Cat, ChevronDown, Clock3, Dog, Fish, Leaf, PawPrint, Sparkles } from "lucide-react";

const filters = [
  { label: "Tous", Icon: PawPrint },
  { label: "Chiens", Icon: Dog },
  { label: "Chats", Icon: Cat },
  { label: "Oiseaux", Icon: Bird },
  { label: "Poissons", Icon: Fish },
] as const;
type Category = Exclude<(typeof filters)[number]["label"], "Tous">;
type Article = {
  id: string; category: Category; theme: string; title: string; description: string;
  image: string; alt: string; date: string; dateLabel: string; minutes: number;
  sections: { title: string; text: string }[]; takeaway: string;
};

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=80`;
const featured: Article = {
  id: "petits-rituels", category: "Chiens", theme: "Vie quotidienne",
  title: "Petits rituels, grande complicité.",
  description: "Et si le bonheur se cachait dans les habitudes les plus simples ? Balades, jeux et moments de calme : le carnet d’une journée qui fait du bien.",
  image: photo("photo-1548199973-03cce0bbc87b"), alt: "Deux chiens courant ensemble dans la nature",
  date: "2026-11-12", dateLabel: "12 novembre 2026", minutes: 5,
  sections: [
    { title: "Commencer par un moment partagé", text: "Dans ce carnet imaginaire, Khalil et son chien commencent leur journée par une promenade tranquille. Pas de parcours chronométré : ils prennent le temps de découvrir le quartier et de profiter de ce moment ensemble." },
    { title: "Varier les plaisirs", text: "Une petite séance de jeu remplace parfois le grand tour habituel. Une balle, une recherche de jouet ou un nouvel itinéraire suffisent à rendre une journée familière un peu différente. Le rythme reste adapté au compagnon et à ses envies." },
    { title: "Savoir aussi ne rien faire", text: "La complicité ne se mesure pas au nombre d’activités. Un coin confortable, une présence tranquille et un moment sans sollicitation ont aussi leur place dans cette journée idéale." },
  ], takeaway: "Le plus beau rituel ? Un petit moment d’attention, partagé régulièrement.",
};

const articles: Article[] = [
  {
    id: "balades-curieuses", category: "Chiens", theme: "Balades & découvertes", title: "La balade, bien plus qu’un tour du quartier",
    description: "Changer de chemin, ralentir et laisser une place à la curiosité : redécouvrez vos sorties à deux.",
    image: photo("photo-1552053831-71594a27632d"), alt: "Golden retriever à l’extérieur", date: "2026-11-10", dateLabel: "10 novembre 2026", minutes: 4,
    sections: [{ title: "Un nouveau regard sur le quotidien", text: "Dans notre histoire, Sami emprunte une rue différente avec son chien. Le trajet est presque le même, mais les nouvelles odeurs et les petits détours transforment la sortie en découverte partagée." }, { title: "Un rythme à deux", text: "Préparer les accessoires de promenade et choisir un trajet adapté permet de profiter du moment. L’idée de ce récit : laisser de la place aux pauses plutôt que vouloir toujours aller plus loin." }],
    takeaway: "Une promenade réussie peut être courte, simple et pleine de découvertes.",
  },
  {
    id: "maison-chat", category: "Chats", theme: "Un intérieur à explorer", title: "Un petit chez-soi pensé pour les grands curieux",
    description: "Perchoirs, cachettes et coins douillets : une maison à regarder à hauteur de moustaches.",
    image: photo("photo-1573865526739-10659fec78a5"), alt: "Chat roux au regard curieux", date: "2026-11-08", dateLabel: "8 novembre 2026", minutes: 5,
    sections: [{ title: "Regarder la pièce autrement", text: "Lina imagine son salon du point de vue de son chat. Un espace stable en hauteur devient un poste d’observation, et un carton ouvert se transforme en petite cachette accessible." }, { title: "Des espaces pour choisir", text: "Dans cet intérieur fictif, chaque activité trouve sa place : observer, se reposer ou jouer. Les accès restent dégagés et les installations sont stables, pour que le chat puisse choisir son moment." }],
    takeaway: "Parfois, un coin bien choisi compte plus qu’un nouvel accessoire.",
  },
  {
    id: "oiseaux-observer", category: "Oiseaux", theme: "Moments de complicité", title: "Le plaisir d’observer, tout simplement",
    description: "Un carnet, un peu de calme et une nouvelle façon de découvrir la personnalité de son oiseau.",
    image: photo("photo-1552728089-57bdde30beb3"), alt: "Perroquets colorés dans un décor végétal", date: "2026-11-06", dateLabel: "6 novembre 2026", minutes: 3,
    sections: [{ title: "Un rendez-vous tranquille", text: "Chaque matin, notre personnage note un détail dans son carnet : un chant, un mouvement ou une préférence. Ce petit rituel d’observation lui permet de mieux connaître son compagnon sans le solliciter constamment." }, { title: "Respecter les moments de pause", text: "La scène se déroule dans une ambiance calme. L’oiseau peut s’éloigner ou se reposer, tandis que son humain apprend à apprécier les interactions spontanées." }],
    takeaway: "La curiosité et la patience font de beaux moments à partager.",
  },
  {
    id: "aquarium-decor", category: "Poissons", theme: "Inspiration aquatique", title: "Un aquarium qui raconte une histoire",
    description: "Une ambiance végétale, quelques reliefs et des espaces ouverts pour composer un décor harmonieux.",
    image: photo("photo-1522069169874-c58ec4b76be5"), alt: "Poissons dans un aquarium aux couleurs lumineuses", date: "2026-11-04", dateLabel: "4 novembre 2026", minutes: 4,
    sections: [{ title: "Choisir une ambiance", text: "Pour son aquarium imaginaire, Youssef choisit une palette de verts et de tons naturels. Il esquisse d’abord le décor sur papier, en laissant des espaces dégagés entre les éléments." }, { title: "Penser au-delà de l’esthétique", text: "Dans ce projet fictif, chaque élément serait choisi en fonction des espèces accueillies et de son usage aquatique. Une jolie composition reste avant tout un habitat à concevoir avec les besoins de ses occupants en tête." }],
    takeaway: "Un décor harmonieux laisse aussi de la place à ses habitants.",
  },
  {
    id: "jouets-chien", category: "Chiens", theme: "Jeux & complicité", title: "Le jouet préféré n’est pas toujours le plus compliqué",
    description: "La petite histoire d’un panier à jouets et de quelques idées pour renouveler les moments de jeu.",
    image: photo("photo-1587300003388-59208cc962cb"), alt: "Chien attentif dans un jardin", date: "2026-11-02", dateLabel: "2 novembre 2026", minutes: 3,
    sections: [{ title: "Redécouvrir ce que l’on a déjà", text: "Khalil range une partie des jouets de son compagnon et en garde quelques-uns à disposition. Lorsqu’il les échange plus tard, les anciens favoris retrouvent une place dans leurs moments partagés." }, { title: "Jouer ensemble", text: "Le récit se termine par une séance de jeu courte et accompagnée. Les accessoires sont adaptés au chien et vérifiés avant utilisation. Ce qui rend ce moment spécial, c’est surtout l’attention de son humain." }],
    takeaway: "Le meilleur ingrédient d’une séance de jeu, c’est votre présence.",
  },
  {
    id: "pause-chat", category: "Chats", theme: "La douceur du quotidien", title: "L’art de la pause, version féline",
    description: "À l’ombre d’un rideau ou près de vous : ces petits coins qui deviennent de grands favoris.",
    image: photo("photo-1514888286974-6c03e2ca1dba"), alt: "Portrait d’un chat paisible", date: "2026-10-29", dateLabel: "29 octobre 2026", minutes: 3,
    sections: [{ title: "Le coin qu’il a choisi", text: "Dans cette scène de vie inventée, un chat délaisse son nouveau coussin pour une simple couverture près du canapé. Sa famille commence par observer ce qui lui plaît dans cet emplacement." }, { title: "Inviter sans imposer", text: "Une texture familière et un passage tranquille rendent le lieu accueillant. Le chat reste libre de changer d’endroit et de venir partager un moment lorsqu’il le souhaite." }],
    takeaway: "Laissez une place au choix, même pour les plus petites habitudes.",
  },
  {
    id: "carnet-oiseaux", category: "Oiseaux", theme: "Un quotidien inspirant", title: "Des couleurs et des idées pour son espace",
    description: "Un petit tableau d’inspiration pour imaginer un environnement aussi soigné que personnel.",
    image: photo("photo-1444464666168-49d633b86797"), alt: "Petit oiseau posé sur une branche", date: "2026-10-25", dateLabel: "25 octobre 2026", minutes: 4,
    sections: [{ title: "Dessiner avant d’aménager", text: "Notre personnage commence par un croquis de l’espace de son oiseau. Il imagine différentes zones et garde un accès facile pour l’entretien, sans surcharger l’ensemble." }, { title: "Des choix adaptés", text: "Le croquis sert de point de départ, pas de recette universelle. Dans ce projet, les dimensions et les accessoires seraient sélectionnés selon l’espèce et les habitudes de l’oiseau, avec des matériaux prévus pour cet usage." }],
    takeaway: "Une belle idée commence par l’espace et les besoins de son compagnon.",
  },
  {
    id: "aquarium-pause", category: "Poissons", theme: "Instants contemplatifs", title: "Cinq minutes devant un autre monde",
    description: "Le rituel tout simple d’une pause devant l’aquarium, loin des écrans et du bruit.",
    image: photo("photo-1546026423-cc4642628d2b"), alt: "Scène sous-marine avec des poissons et des coraux", date: "2026-10-21", dateLabel: "21 octobre 2026", minutes: 3,
    sections: [{ title: "Une fenêtre sur le calme", text: "Chaque soir, Nour pose son téléphone et s’assoit quelques minutes devant son aquarium. Elle suit les déplacements des poissons sans chercher à attirer leur attention." }, { title: "Apprendre à remarquer les détails", text: "Les reflets, les passages entre les plantes et les couleurs lui offrent un spectacle différent chaque jour. Ce petit récit célèbre simplement le plaisir d’observer un environnement vivant." }],
    takeaway: "Il suffit parfois de s’arrêter pour redécouvrir ce qui nous entoure.",
  },
];

function BlogImage({ article, hero = false }: { article: Pick<Article, "image" | "alt">; hero?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <Image src={failed ? "/logo-animalerie.png" : article.image} alt={article.alt} fill
    sizes={hero ? "(max-width: 1023px) 100vw, 600px" : "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px"}
    loading={hero ? "eager" : "lazy"} unoptimized onError={() => setFailed(true)}
    className={failed ? "bg-[#EDF2E8] object-contain p-12" : "object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"} />;
}

function Reading({ article }: { article: Article }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reducedMotion = useReducedMotion();
  return <div className="mt-5 border-t border-gray-100 pt-4">
    <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}
      className="flex w-full items-center justify-between gap-3 rounded-lg py-1 text-left text-sm font-bold text-[#357800] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65D900]">
      {open ? "Refermer l’article" : "Prendre le temps de lire"}<ChevronDown size={18} aria-hidden="true" className={`shrink-0 transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
    </button>
    <div id={id}>
      <AnimatePresence initial={false}>
        {open && <motion.div key="reading" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .25 }} className="overflow-hidden">
          <div className="space-y-5 pt-6">
            {article.sections.map(section => <div key={section.title}><h4 className="text-sm font-bold text-gray-900">{section.title}</h4><p className="mt-2 text-sm leading-7 text-gray-600">{section.text}</p></div>)}
            <div className="rounded-xl border border-[#65D900]/20 bg-[#65D900]/[0.07] p-4"><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#357800]"><Leaf size={15} aria-hidden="true" />Le petit mot de Khalil</p><p className="text-sm leading-6 text-gray-700">{article.takeaway}</p></div>
          </div>
        </motion.div>}
      </AnimatePresence>
    </div>
  </div>;
}

function ArticleMeta({ article }: { article: Article }) {
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500"><time dateTime={article.date}>{article.dateLabel}</time><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1.5"><Clock3 size={13} aria-hidden="true" />{article.minutes} min de lecture</span></div>;
}

export default function KhalilAstucesPage() {
  const [active, setActive] = useState<(typeof filters)[number]["label"]>("Tous");
  const visible = articles.filter(article => active === "Tous" || article.category === active);

  return <div className="overflow-hidden bg-[#F7F8F6] text-[#111111]">
 

    <div className="mx-auto max-w-7xl px-5 py-12 sm:py-16 lg:px-8">
  

      <section id="articles" aria-labelledby="articles-title" className="scroll-mt-40 pt-14 sm:pt-20">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#438F00]">À chaque compagnon, son univers</p><h2 id="articles-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Un peu de lecture,<br className="sm:hidden" /> beaucoup d’idées<span className="text-[#65D900]">.</span></h2></div><p role="status" aria-live="polite" className="text-xs font-medium text-gray-500">{visible.length} articles à découvrir</p></div>
        <div role="group" aria-label="Filtrer les articles par animal" className="mb-8 mt-7 flex flex-wrap gap-2 sm:gap-3">
          {filters.map(({ label, Icon }) => <button key={label} type="button" aria-pressed={active === label} aria-controls="articles-grid" onClick={() => setActive(label)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#65D900] sm:px-5 ${active === label ? "border-[#010101] bg-[#010101] text-[#65D900]" : "border-gray-200 bg-white text-gray-500 hover:border-[#65D900] hover:text-gray-900"}`}><Icon size={17} aria-hidden="true" />{label}</button>)}
        </div>
        <div id="articles-grid" className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(article => <article key={article.id} className="group overflow-hidden rounded-2xl border border-gray-200/70 bg-white transition-shadow duration-300 hover:shadow-xl hover:shadow-black/5 motion-reduce:transition-none">
            <div className="relative aspect-[16/10] overflow-hidden"><BlogImage article={article} /><span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-gray-800 shadow-sm backdrop-blur-sm">{article.category}</span><span aria-hidden="true" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm"><ArrowUpRight size={17} /></span></div>
            <div className="p-5 sm:p-6"><p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#438F00]">{article.theme}</p><h3 className="text-xl font-bold leading-7 tracking-tight">{article.title}</h3><p className="mb-5 mt-3 text-sm leading-7 text-gray-500">{article.description}</p><ArticleMeta article={article} /><Reading article={article} /></div>
          </article>)}
        </div>
      </section>

      <aside className="relative mt-14 overflow-hidden rounded-3xl bg-[#EAF2E2] px-6 py-8 text-center sm:mt-20 sm:px-12 sm:py-12">
        <PawPrint aria-hidden="true" className="pointer-events-none absolute -bottom-4 -right-3 h-32 w-32 -rotate-12 text-[#65D900]/15" /><span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-[#438F00]"><Leaf size={23} aria-hidden="true" /></span><h2 className="relative mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">La meilleure astuce ? Prendre du temps ensemble.</h2><p className="relative mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-600">Chaque compagnon a sa personnalité. Observez, partagez et savourez les petits moments : ce sont eux qui font les plus belles histoires.</p>
      </aside>
      <p className="mt-7 text-center text-xs leading-6 text-gray-400">Carnet de démonstration : articles, personnages et dates fictifs. Photographies d’illustration.</p>
    </div>
  </div>;
}
