import { z } from 'zod';

const text = z.string().max(12000);
const image = z
  .string()
  .max(2000)
  .refine(
    (v) => /^\/(?!\/)/.test(v) || /^https:\/\//.test(v),
    'Uporabite lokalno pot ali naslov HTTPS.',
  );
export const contentSchema = z
  .object({
    brand: z.object({
      name: text,
      tagline: text,
      email: z.email().or(z.literal('')),
      phone: text,
      area: text,
      company: text,
      address: text,
      registration: text,
    }),
    nav: z.object({
      services: text,
      process: text,
      pricing: text,
      faq: text,
      contact: text,
      cta: text,
    }),
    hero: z.object({
      eyebrow: text,
      title: text,
      accent: text,
      description: text,
      cta: text,
      secondary: text,
      image,
      imageAlt: text,
      imageLabel: text,
      imageCaption: text,
      note: text,
      floatingTitle: text,
      floatingText: text,
    }),
    trust: z
      .array(z.object({ title: text, description: text }))
      .min(1)
      .max(6),
    services: z.object({
      eyebrow: text,
      title: text,
      description: text,
      link: text,
      items: z
        .array(
          z.object({
            slug: z.string().regex(/^[a-z0-9-]+$/),
            title: text,
            description: text,
            detail: text,
            image,
            imageAlt: text,
            label: text,
          }),
        )
        .min(1)
        .max(16),
    }),
    about: z.object({
      eyebrow: text,
      title: text,
      description: text,
      image,
      imageAlt: text,
      points: z
        .array(z.object({ title: text, description: text }))
        .min(1)
        .max(8),
    }),
    process: z.object({
      eyebrow: text,
      title: text,
      description: text,
      items: z
        .array(z.object({ title: text, description: text }))
        .min(1)
        .max(8),
    }),
    pricing: z.object({
      eyebrow: text,
      title: text,
      description: text,
      note: text,
      cta: text,
      items: z
        .array(z.object({ title: text, price: text, description: text }))
        .min(1)
        .max(12),
    }),
    faq: z.object({
      eyebrow: text,
      title: text,
      description: text,
      items: z
        .array(z.object({ question: text, answer: text }))
        .min(1)
        .max(30),
    }),
    contact: z.object({
      eyebrow: text,
      title: text,
      description: text,
      emailLabel: text,
      phoneLabel: text,
      areaLabel: text,
      hoursLabel: text,
      unavailable: text,
      hours: z
        .array(z.object({ day: text, time: text }))
        .min(1)
        .max(8),
    }),
    form: z.object({
      eyebrow: text,
      title: text,
      description: text,
      name: text,
      namePlaceholder: text,
      email: text,
      emailPlaceholder: text,
      phone: text,
      phonePlaceholder: text,
      service: text,
      other: text,
      location: text,
      locationPlaceholder: text,
      message: text,
      messagePlaceholder: text,
      submit: text,
      sending: text,
      security: text,
      consent: text,
      privacyLink: text,
      success: text,
      demoSuccess: text,
      choose: text,
    }),
    ui: z.object({
      home: text,
      serviceDetailTitle: text,
      cleaningLabel: text,
      notFoundTitle: text,
      notFoundText: text,
      backHome: text,
    }),
    footer: z.object({
      description: text,
      navigation: text,
      contact: text,
      copyright: text,
      privacy: text,
      terms: text,
      backTop: text,
    }),
    seo: z.object({ title: text, description: text, socialImage: image }),
    legal: z.object({
      privacyTitle: text,
      privacy: text,
      termsTitle: text,
      terms: text,
    }),
    extra: z.array(z.object({ title: text, text: text })).max(20),
  })
  .superRefine((value, ctx) => {
    const slugs = value.services.items.map((item) => item.slug);
    if (new Set(slugs).size !== slugs.length)
      ctx.addIssue({
        code: 'custom',
        path: ['services', 'items'],
        message: 'Vsaka storitev mora imeti svoj enoličen naslov URL.',
      });
  });
export type SiteContent = z.infer<typeof contentSchema>;

export const defaultContent: SiteContent = {
  brand: {
    name: 'brezmadeža.',
    tagline: 'Čisto dober občutek.',
    email: 'contact@brezmadeza.si',
    phone: '031 392 153',
    area: 'Območje izvajanja po dogovoru',
    company: '',
    address: '',
    registration: '',
  },
  nav: {
    services: 'Storitve',
    process: 'Kako poteka',
    pricing: 'Cenik',
    faq: 'Pogosta vprašanja',
    contact: 'Kontakt',
    cta: 'Oddajte povpraševanje',
  },
  hero: {
    eyebrow: 'GLOBINSKO ČIŠČENJE NA VAŠEM DOMU',
    title: 'Svežina, ki jo vidite.',
    accent: 'Čistoča, ki jo občutite.',
    description:
      'Vaša najljubša sedežna. Miren spanec. Dom, v katerem se dobro počutite. Z globinskim čiščenjem vdihnemo novo svežino stvarem, ki jih imate radi.',
    cta: 'Želim svež dom',
    secondary: 'Raziščite storitve',
    image: '/images/hero.webp',
    imageAlt:
      'Svetla dnevna soba z udobno sedežno garnituro v naravnih odtenkih',
    imageLabel: 'VEČ SVEŽINE. VEČ DOMA.',
    imageCaption: '01 / DOM, KI DIHA.',
    note: 'Brez obveznosti. Ponudba po vaših željah.',
    floatingTitle: 'Spet vaš najljubši kotiček.',
    floatingText: 'Za vse male trenutke doma.',
  },
  trust: [
    { title: 'Pridemo k vam', description: 'Čiščenje v udobju vašega doma' },
    {
      title: 'Skrbno do materialov',
      description: 'Postopek prilagodimo površini',
    },
    { title: 'Jasna ponudba', description: 'Ceno uskladimo pred čiščenjem' },
    {
      title: 'Termin po dogovoru',
      description: 'Poiščemo čas, ki vam ustreza',
    },
  ],
  services: {
    eyebrow: 'MAJHNA OSVEŽITEV. VELIKA RAZLIKA.',
    title: 'Vsak kotiček si zasluži svež začetek.',
    description:
      'Od najljubšega naslanjača do vzmetnice, na kateri se začne dober dan. Izberite, kaj potrebuje malo naše pozornosti.',
    link: 'Več o storitvi',
    items: [
      {
        slug: 'sedezne-garniture',
        title: 'Sedežne garniture',
        description: 'Za večere na kavču, ki spet dišijo po svežem.',
        detail:
          'Globinsko čiščenje tekstilnih sedežnih garnitur, kavčev in naslanjačev. Površino pregledamo, izberemo postopek glede na material ter se posvetimo madežem in vsakdanji umazaniji. Pred začetkom ocenimo pričakovani rezultat. Vseh madežev ni mogoče povsem odstraniti; to je odvisno od njihove starosti, vrste in materiala.',
        image: '/images/sofa.webp',
        imageAlt: 'Udobna tekstilna sedežna garnitura',
        label: 'NAJLJUBŠI KOTIČEK',
      },
      {
        slug: 'vzmetnice',
        title: 'Vzmetnice',
        description: 'Svežina za vaš miren spanec in lepše jutro.',
        detail:
          'Čiščenje vzmetnic in oblazinjenih posteljnih površin prilagodimo sestavi ter navodilom proizvajalca. Namen je odstranitev umazanije iz tekstila in osvežitev površine. Po čiščenju je potrebno temeljito sušenje in prezračevanje. Storitev ne nadomešča zdravljenja alergij in ne zagotavlja sterilnosti.',
        image: '/images/bed.webp',
        imageAlt: 'Svetla spalnica z urejeno posteljo',
        label: 'MIREN SPANEC',
      },
      {
        slug: 'preproge',
        title: 'Preproge in tepihi',
        description: 'Mehko pod nogami. Prijetno v vašem domu.',
        detail:
          'Globinsko čiščenje preprog in tepihov pomaga odstraniti nabrano umazanijo ter osvežiti videz vlaken. Primernost postopka preverimo glede na material, obstojnost barv in podlago. Posebne ali občutljive preproge zahtevajo predhodno presojo. Čas sušenja je odvisen od debeline in zračenja prostora.',
        image: '/images/rug.webp',
        imageAlt: 'Mehka preproga v naravno osvetljenem bivalnem prostoru',
        label: 'ČISTO VSAK KORAK',
      },
      {
        slug: 'stoli-in-oblazinjeno-pohistvo',
        title: 'Stoli in drugo pohištvo',
        description: 'Za skupne obroke in vse, kar prinese dan.',
        detail:
          'Očistimo oblazinjene jedilne in pisarniške stole, klopi ter drugo tekstilno pohištvo po dogovoru. Vsak kos pregledamo in prilagodimo postopek njegovi sestavi. Za poslovne prostore pripravimo ponudbo glede na količino, dostopnost ter želeni termin izvedbe.',
        image: '/images/chair.webp',
        imageAlt: 'Oblazinjeni stoli ob jedilni mizi',
        label: 'V DOBRI DRUŽBI',
      },
    ],
  },
  about: {
    eyebrow: 'DOM JE ZA ŽIVLJENJE.',
    title: 'Spomini naj ostanejo. Madeži pa ne.',
    description:
      'Razlita kava. Tačke na kavču. Nedeljski zajtrki v postelji. Življenje pušča sledi – mi pa pomagamo, da vaš dom spet zadiha.',
    image: '/images/detail.webp',
    imageAlt: 'Detajl tekstilnega oblazinjenja in naravnih materialov v domu',
    points: [
      {
        title: 'Več kot čiščenje na površini',
        description:
          'Globinsko čiščenje se posveti umazaniji, ki je običajno sesanje ne doseže.',
      },
      {
        title: 'Pravi pristop za vaš material',
        description:
          'Pred čiščenjem preverimo površino in izberemo primeren postopek.',
      },
      {
        title: 'Iskreno o pričakovanem rezultatu',
        description: 'Povemo, kaj lahko dosežemo. Brez obljub o čudežih.',
      },
    ],
  },
  process: {
    eyebrow: 'PREPROSTO OD ZAČETKA DO SVEŽINE',
    title: 'Vi si izberite kotiček. Za ostalo se dogovorimo.',
    description: 'Malo vašega časa. Veliko bolj prijeten dom.',
    items: [
      {
        title: 'Povejte nam, kaj potrebujete',
        description:
          'Izpolnite kratek obrazec. Opišite pohištvo, približno velikost in morebitne madeže.',
      },
      {
        title: 'Dogovorimo se za ponudbo in termin',
        description:
          'Preverimo podrobnosti, uskladimo ceno in skupaj poiščemo primeren čas.',
      },
      {
        title: 'Pridemo in skrbno očistimo',
        description:
          'Zaščitimo okolico in postopek prilagodimo materialu. Vi pa se posvetite svojemu dnevu.',
      },
      {
        title: 'Uživajte v svežini',
        description:
          'Prejmete navodila za sušenje in nego. Ko se površina posuši, je spet čas za udobje.',
      },
    ],
  },
  pricing: {
    eyebrow: 'JASNO, PREDEN ZAČNEMO',
    title: 'Vsak dom je drugačen. Tudi ponudba je vaša.',
    description:
      'Cena je odvisna od velikosti, materiala, stanja in lokacije. Pošljite nam nekaj podrobnosti in pripravili bomo ponudbo za vaše čiščenje.',
    note: 'Končno ceno in morebitni strošek prihoda vedno potrdimo pred izvedbo. Oddaja povpraševanja vas ne zavezuje k naročilu.',
    cta: 'Pridobite svojo ponudbo',
    items: [
      {
        title: 'Sedežna garnitura',
        price: 'Po ponudbi',
        description: 'Glede na število sedišč in obliko',
      },
      {
        title: 'Vzmetnica',
        price: 'Po ponudbi',
        description: 'Glede na dimenzije in obseg čiščenja',
      },
      {
        title: 'Preproga ali tepih',
        price: 'Po ponudbi',
        description: 'Glede na površino in vrsto vlaken',
      },
      {
        title: 'Stoli in drugo',
        price: 'Po ponudbi',
        description: 'Glede na število kosov in material',
      },
    ],
  },
  faq: {
    eyebrow: 'DOBRO JE VEDETI',
    title: 'Še kakšno vprašanje?',
    description: 'Da bo odločitev lažja, smo zbrali nekaj uporabnih odgovorov.',
    items: [
      {
        question: 'Koliko časa se pohištvo suši?',
        answer:
          'Čas je odvisen od materiala, količine vlage, temperature in prezračevanja. Računajte na več ur, pri nekaterih materialih tudi dlje. Po čiščenju vam podamo navodila; površino uporabljajte šele, ko je povsem suha.',
      },
      {
        question: 'Ali lahko odstranite vse madeže?',
        answer:
          'Vseh madežev ni mogoče odstraniti. Uspešnost je odvisna od izvora, starosti madeža in materiala. Pred delom pregledamo površino in vam iskreno predstavimo pričakovani rezultat.',
      },
      {
        question: 'Kako naj se pripravim na prihod?',
        answer:
          'S pohištva odstranite osebne predmete in omogočite dostop. Praviloma potrebujemo dostop do vode in elektrike. O posebnostih prostora se dogovorimo pred terminom.',
      },
      {
        question: 'Na katerem območju opravljate čiščenje?',
        answer:
          'Lokacijo vpišite v povpraševanje. Preverili bomo možnost prihoda in vam pred potrditvijo sporočili tudi morebiten strošek poti.',
      },
      {
        question: 'Kako pogosto je priporočljivo globinsko čiščenje?',
        answer:
          'Odvisno je od uporabe, materiala, otrok in domačih živali. Upoštevajte navodila proizvajalca pohištva; pri izbiri primernega intervala vam pomagamo glede na stanje površine.',
      },
      {
        question: 'Ali oddaja povpraševanja pomeni rezervacijo?',
        answer:
          'Ne. Povpraševanje je neobvezujoče. Termin velja šele po skupni potrditvi obsega storitve, cene in časa izvedbe.',
      },
    ],
  },
  contact: {
    eyebrow: 'NAREDIMO PROSTOR ZA SVEŽINO',
    title: 'Vaš svež začetek je le sporočilo stran.',
    description:
      'Povejte nam, kaj bi radi očistili. Skupaj bomo našli pravo rešitev za vaš dom.',
    emailLabel: 'Pišite nam',
    phoneLabel: 'Pokličite nas',
    areaLabel: 'Kje čistimo',
    hoursLabel: 'Delovni čas',
    unavailable: 'Kontaktni podatki bodo objavljeni kmalu. Uporabite obrazec.',
    hours: [
      { day: 'Ponedeljek–petek', time: 'Po dogovoru' },
      { day: 'Sobota', time: 'Po dogovoru' },
      { day: 'Nedelja in prazniki', time: 'Po dogovoru' },
    ],
  },
  form: {
    eyebrow: 'NEOBVEZUJOČE POVPRAŠEVANJE',
    namePlaceholder: 'Vaše ime in priimek',
    emailPlaceholder: 'ime@primer.si',
    phonePlaceholder: 'Vaša telefonska številka',
    locationPlaceholder: 'Vaš kraj',
    other: 'Več storitev / drugo',
    sending: 'Pošiljanje …',
    security: 'Vaši podatki ostanejo zasebni.',
    title: 'Kaj lahko osvežimo za vas?',
    description: 'Izpolnite obrazec za neobvezujočo ponudbo.',
    name: 'Ime in priimek',
    email: 'E-pošta',
    phone: 'Telefon (neobvezno)',
    service: 'Kaj želite očistiti?',
    location: 'Kraj izvedbe',
    message: 'Povejte nam še malo več',
    messagePlaceholder:
      'Vrsta pohištva, število sedišč, velikost, madeži, želeni termin …',
    submit: 'Pošljite povpraševanje',
    consent:
      'Seznanjen/-a sem z obdelavo osebnih podatkov za odgovor na povpraševanje.',
    privacyLink: 'Zasebnost',
    success:
      'Hvala! Vaše povpraševanje je poslano. O nadaljnjih korakih se dogovorimo po e-pošti.',
    demoSuccess:
      'Povpraševanje je shranjeno v lokalnem predogledu. E-pošta še ni povezana, zato sporočilo ni bilo poslano.',
    choose: 'Izberite storitev',
  },
  footer: {
    description: 'Več svežine v vašem domu.\nVeč časa za stvari, ki štejejo.',
    navigation: 'Raziščite',
    contact: 'Ostanimo v stiku',
    copyright: 'Vse pravice pridržane.',
    privacy: 'Zasebnost',
    terms: 'Pogoji poslovanja',
    backTop: 'Na vrh',
  },
  seo: {
    title:
      'Brezmadeža | Globinsko čiščenje sedežnih garnitur, vzmetnic in preprog',
    description:
      'Globinsko čiščenje sedežnih garnitur, vzmetnic, preprog in oblazinjenega pohištva na vašem domu. Preverite storitve in oddajte neobvezujoče povpraševanje.',
    socialImage: '/images/hero.webp',
  },
  legal: {
    privacyTitle: 'Zasebnost in osebni podatki',
    privacy:
      'PREDLOG ZA DOPOLNITEV PRED OBJAVO\n\nUpravljavec: podatke podjetja in kontakt dopolnite v urejevalniku.\n\nObrazec zbira ime, e-poštni naslov, morebitni telefon, kraj in opis povpraševanja za pripravo odgovora ter ponudbe. V sporočilo ne vpisujte občutljivih osebnih podatkov.\n\nSpletna stran uporablja Cloudflare za gostovanje in zaščito pred avtomatiziranimi zahtevami ter Web3Forms za posredovanje e-pošte, ko je povezava omogočena. Web3Forms lahko podatke obdeluje zunaj EGP. Pred objavo dopolnite informacije o obdelovalcih, pravni podlagi, mednarodnih prenosih in dejanskih rokih hrambe.\n\nZa zahteve glede dostopa, popravka ali izbrisa podatkov se obrnite na upravljavca. Dopolnite kontakt in informacije o pravici do pritožbe pri Informacijskem pooblaščencu.\n\nSpletna stran ne vključuje oglaševalskih sledilnikov. Za prijavo v uredništvo uporablja nujni sejni piškotek.',
    termsTitle: 'Pogoji poslovanja',
    terms:
      'PREDLOG ZA DOPOLNITEV PRED OBJAVO\n\nPodatke izvajalca, poslovni naslov, identifikacijske podatke in kontakt dopolnite v urejevalniku.\n\nOddaja povpraševanja je neobvezujoča. Storitev, obseg, cena, stroški poti in termin se dogovorijo pred izvedbo.\n\nRezultat čiščenja je odvisen od materiala, predhodne obdelave ter vrste in starosti madežev. Odstranitve vseh madežev ni mogoče zagotoviti. Po izvedbi upoštevajte navodila za sušenje in nego.\n\nPred javno objavo dopolnite plačilne pogoje, odpoved termina, obravnavo reklamacij in pravice potrošnikov glede na dejanski način poslovanja.',
  },
  ui: {
    home: 'Domov',
    serviceDetailTitle: 'Čiščenje, prilagojeno vašemu pohištvu.',
    cleaningLabel: 'GLOBINSKO ČIŠČENJE',
    notFoundTitle: 'Ta kotiček še ni urejen.',
    notFoundText: 'Iskane strani ni mogoče najti.',
    backHome: 'Nazaj domov',
  },
  extra: [],
};
