# Brezmadeža.si

Spletna stran v slovenščini za globinsko čiščenje. Lokalni projekt za prenos v poljubni GitHub račun in gostovanje na **Cloudflare Workers z Git integracijo**. Ni povezan z nobenim oddaljenim računom in ni javno objavljen.

## Lokalni zagon

Zahteve: Node.js 22.12 ali novejši, priporočeno Node.js 24 LTS.

```sh
npm ci
```

Kopirajte `.dev.vars.example` v `.dev.vars`, določite lokalno geslo in vsaj 32 naključnih znakov za `SESSION_SECRET`. Datoteka je izključena iz Gita. Nato:

```sh
npm run db:local
npm run dev
```

- Stran: http://127.0.0.1:4321/
- Urejevalnik: http://127.0.0.1:4321/admin
- Trenutno lokalno geslo je zapisano v `.dev.vars`. Produkcijsko geslo nastavite posebej.

Brez integracijskih ključev lokalni obrazec preveri polja, shrani povpraševanje v lokalni D1 in izrecno sporoči, da e-pošta ni bila poslana. Obhod Turnstile je mogoč samo v razvojnem načinu na localhost/127.0.0.1, če ni nastavljen noben Turnstile ključ. Produkcijska različica se ob manjkajočih ključih zapre z napako; nikoli ne preklopi v demonstracijski način.

## Kaj je vključeno

- Astro 7 s strežniškim izrisom HTML za iskalnike in lahkimi React komponentami za obrazec ter uredništvo.
- Odzivna zasnova, lokalne pisave, fotografije WebP, animacije ob prikazu in prehodu miške, podpora zmanjšanemu gibanju.
- Posamezne strani storitev, semantični naslovi, kanonični URL, Open Graph, strukturirani podatki za organizacijo/storitve/FAQ, dinamična datoteka sitemap.
- Urejevalnik brez javnih povezav in brez vnosa v sitemap. `noindex` v HTML in glavi odgovora. Pot ni varnostni mehanizem; vse skrbniške API operacije zahtevajo preverjeno sejo.
- Urejanje besedil, kontaktov, slik, cen, SEO podatkov, pravnih predlog in dodatnih sekcij. Dodajanje, odstranjevanje ter razvrščanje storitev, FAQ in drugih seznamov.
- Izvoz/uvoz vsebine JSON. Spremembe se shranijo v D1, ne v lokalni pomnilnik brskalnika. Zaznavanje konfliktov med urejevalniki.
- Inbox povpraševanj: pregled, označitev kot obravnavano, odgovor prek e-poštnega odjemalca ter izbris osebnih podatkov.
- Geslo iz Cloudflare secret, naključne seje, v bazi samo zgoščene sejne vrednosti, HttpOnly/SameSite in pri HTTPS Secure piškotek. Seja velja 8 ur in se ob odjavi prekliče.
- Preverjanje izvora za mutacije, omejitev velikosti zahtev, validacija Zod, omejitev poskusov prijave in povpraševanj, strežniški Turnstile Siteverify z akcijo in gostiteljem.

## Nasveti in članki

Javna knjižnica je na `/nasveti`, posamezni prispevki na `/nasveti/naslov-prispevka`. Povezava je v glavni in mobilni navigaciji ter nogi strani. Objavljeni prispevki so strežniško izrisani, vključeni v sitemap in imajo svoje SEO podatke. Seznam omogoča iskanje in filtriranje po kategorijah.

V `/admin` odprite **Nasveti in prispevki** in izberite **Nov prispevek**. Dodajte naslov, kratek opis in vsebino; kategorija ter naslovna slika sta neobvezni. Besedilo lahko prilepite ali oblikujete z gumbi za krepko, ležeče, mednaslove, sezname, povezave, slike in navedke. Zavihek **Predogled** sproti prikaže oblikovano vsebino. HTML se varno izpiše kot besedilo.

**Shrani prispevke** shrani vse spremembe v D1. Nov prispevek je zasebni osnutek; ko je pripravljen, izberite **Pripravi za objavo** in nato **Shrani prispevke**. **Prestavi v osnutke** in shranjevanje prispevek umakneta iz javnosti. Datum je prikazana oznaka, ne razpored objave. Ob spremembi naslova URL se spremeni tudi povezava do prispevka. Za odstranitev uporabite **Odstrani prispevek**, potrdite in shranite spremembe.

Prispevki so del obstoječega izvoza/uvoza JSON in uporabljajo enako zaščito seje ter preverjanje konfliktov. Nadgradnja obstoječi vsebini samodejno doda prazno knjižnico, brez podatkovne migracije ali prepisovanja drugih vsebin. Omejitev je 100 prispevkov, 80.000 znakov na prispevek in 1,8 MB za celotno vsebino pri shranjevanju/uvozu.

## Prenos na drugi Cloudflare račun

1. Prenesite projekt v želeni GitHub repozitorij. Ne prenašajte `.dev.vars`, `.wrangler`, `node_modules` ali `dist`.
2. V ciljnem Cloudflare računu ustvarite D1 bazo `brezmadeza-content`. Njen ID vstavite v `wrangler.jsonc` namesto lokalne ničelne vrednosti. Binding mora ostati `DB`.
3. Uporabite D1 migrations na ciljnem računu (po prijavi v pravilen račun):

```sh
npx wrangler d1 migrations apply DB --remote
```

4. V Cloudflare Workers ustvarite projekt z GitHub povezavo. Ukaz gradnje: `npm run build`. Ukaz objave: `npx wrangler deploy --keep-vars`. Ime Workerja naj bo `brezmadeza-si`, kot v konfiguraciji. Nastavite Node.js 24. Projekt uporablja Workers, ne statičnega Cloudflare Pages gostovanja.
5. V Worker **Settings → Variables and Secrets** nastavite naslednje runtime vrednosti. Secrets morajo biti na objavljenem Workerju, ne samo v build okolju.

| Vrednost               | Vrsta               | Namen                                                    |
| ---------------------- | ------------------- | -------------------------------------------------------- |
| `ADMIN_PASSWORD`       | Secret              | Dolgo enolično produkcijsko geslo                        |
| `SESSION_SECRET`       | Secret              | Vsaj 32 naključnih znakov; zamenjava prekliče stare seje |
| `TURNSTILE_SECRET_KEY` | Secret              | Skrivni ključ Turnstile                                  |
| `WEB3FORMS_ACCESS_KEY` | Secret ali variable | Web3Forms dostopni ključ za preverjeni prejemni naslov   |
| `TURNSTILE_SITE_KEY`   | Variable            | Javni Turnstile sitekey                                  |
| `TURNSTILE_HOSTNAMES`  | Variable            | `brezmadeza.si,www.brezmadeza.si`                        |
| `SITE_URL`             | Variable            | `https://brezmadeza.si`                                  |

`--keep-vars` ohrani nastavitve dashboarda med Git objavami. Ob drugačnem postopku objave uskladite `TURNSTILE_SITE_KEY` tudi v `wrangler.jsonc`, da prazna privzeta vrednost ne prepiše dashboarda. Izvorna domena, kanonični URL in sitemap so namenjeni brezmadeza.si; ob menjavi domene posodobite tudi `astro.config.mjs` in SEO poti v `src/pages`.

6. Turnstile widget omejite na dejanski produkcijski domeni. Uporablja akciji `contact` in `admin_login`. Produkcijski seznam ne sme vključevati localhost. Za preverjanje na začasni domeni Workers dodajte to domeno widgetu in `TURNSTILE_HOSTNAMES`.
7. Povežite domeno `brezmadeza.si`; drugo različico (www) trajno preusmerite na glavno domeno. Astro lahko ob objavi samodejno ustvari binding `SESSION` za svoj vgrajeni session driver. Aplikacija za svoje prijavne seje uporablja D1.
8. Prijavite se v `/admin`. Vsebino lokalne baze prenesite z izvozom JSON in uvozom v produkcijskem urejevalniku. Git prenos ne prenese lokalnih CMS sprememb iz D1.

### Web3Forms in Turnstile

Obrazec najprej pošlje podatke na naš `/api/inquiry`. Worker preveri Turnstile prek Siteverify (success, action, hostname), validira podatke in shrani povpraševanje v D1. Šele nato brskalnik z javnim Web3Forms access key pošlje e-pošto neposredno na Web3Forms. Ključ Web3Forms je po zasnovi javni identifikator obrazca; ni skrbniško geslo. Turnstile secret nikoli ne pride v brskalnik.

Ta pot upošteva [zahtevo Web3Forms za brskalniško pošiljanje](https://docs.web3forms.com/getting-started/troubleshooting). Njihov standardni API ne dovoljuje običajnega strežniškega proxyja. Dostava e-pošte se potrdi šele po uspešnem odgovoru Web3Forms. Če je shranjevanje uspelo, e-pošta pa ne, uporabnik vidi točno to opozorilo; povpraševanje ostane v inboxu. Pri zaprtju zavihka med korakoma je lahko povpraševanje shranjeno brez e-pošte. Inbox zato ostaja glavni vir prejetih zahtev.

Za omejitev zlorab javnega Web3Forms ključa lahko v njihovem dashboardu omogočite omejitev domene. [Nativna Turnstile zaščita neposredno pri Web3Forms](https://docs.web3forms.com/getting-started/pro-features/cloudflare-turnstile-captcha) in omejevanje domene sta po njihovi dokumentaciji plačljivi funkciji. Trenutna integracija Turnstile ščiti naš API; ne trdi, da lahko omeji neposredne zahteve na neodvisni Web3Forms API. Če v Web3Forms omogočite tudi njihovo nativno captcha preverjanje, potrebujete ločeno svežo captcha pot; isti Turnstile token je mogoče porabiti samo enkrat.

Pred začetkom uporabe z resničnimi podatki dopolnite podatke podjetja, območje, urnik, cene oziroma način oblikovanja ponudbe ter dejanske pogoje poslovanja in zasebnosti. Pravna besedila so jasno označene predloge. Fotografije so predstavitvene fotografije interierjev, ne reference izvedenih čiščenj. Spletna stran nima analitike in oglaševalskih piškotkov.

## Preverjanje

```sh
npm run check
npm run build
npm audit
```

Ko razvojni strežnik teče na 127.0.0.1:4321 in uporabljate lokalne ključe brez integracij:

```sh
npm test
```

Test preveri SSR in SEO, odsotnost javnih admin povezav, varovanje API-jev, preverjanje izvora, prijavo/odjavo, shranjevanje v D1, konflikt različic, podvojene naslove storitev, validacijo ter pot lokalnega povpraševanja. Začasne spremembe vsebine obnovi, testno povpraševanje izbriše. Ne izvaja zunanjega pošiljanja e-pošte. Pravi Turnstile in dejansko e-poštno dostavo preverite po vnosu produkcijskih ključev.

## Fotografije

Predstavitvene fotografije so lokalno shranjene iz Unsplash. Izvorne fotografije:

- [Naslovna dnevna soba](https://images.unsplash.com/photo-1600210492486-724fe5c67fb0)
- [Sedežna garnitura](https://images.unsplash.com/photo-1555041469-a586c61ea9bc)
- [Spalnica](https://images.unsplash.com/photo-1505693416388-ac5ce068fe85)
- [Interier s preprogo](https://images.unsplash.com/photo-1600210491369-e753d80a41f3)
- [Jedilni stoli](https://images.unsplash.com/photo-1617806118233-18e1de247200)
- [Detajl interierja](https://images.unsplash.com/photo-1616486338812-3dadae4b4ace)
