# CLARIX — UPGRADE WEBU

Tahle složka je **pracovní kopie pro upgrade**. Hotový výsledek půjde na GitHub,
Milan ho pošle ke schválení a teprve potom se případně nasadí na clarix.cz.

## Pravidla
- Do `clarix-round8-final-full/` (ostrá verze) se NESAHÁ.
- Upravuje se jen tady, v `CLARIX-UPGRADE/`.
- Na GitHub se nahrává až po dokončení, na Milanův pokyn.

## Z čeho se vychází
Kopie `clarix-round8-final-full` ze 16. 10. 2026. Obsahuje všechny úpravy
odsouhlasené do 21. 9. 2026 včetně světlého režimu a přesměrování v .htaccess.

## POZOR: ostrý web je o verzi pozadu
Na https://www.clarix.cz/ běží starší balík. Ověřeno 16. 10. 2026:
- ostrý web má výchozí režim **tmavý**, tady je **světlý**
- ostrý web nemá přesměrování — http://clarix.cz, https://clarix.cz
  i http://www.clarix.cz vracejí 200 místo 301 na https://www.clarix.cz/

Poslední zip (světlý režim + přesměrování) se 21. 9. už nenahrál.
Přesný stav toho, co běží venku: `ZALOHY/clarix-2026-09-21-pred-svetlym` (ověřeno shodou otisků).

## Zálohy
- `ZALOHA-WEBU-2026-10-16/` — kopie stavu před upgradem
- `ZALOHY/` — starší zálohy podle data

---

## Hotovo 16. 10. 2026 — dvě nové stránky

**`clientelo.html`** a **`strat3x.html`** — obsah převzatý z clientelo.cz a strat3x.com,
texty přepsané, podstata zachovaná. Přidány do menu (počítač i telefon) a do patičky
na všech stránkách.

### Co bylo podle zadání vynecháno
- jména osob (zakladatelé, partneři)
- kontaktní údaje obou firem (telefony, e-maily) — používají se kontakty CLARIXu
- názvy cizích firem uváděné v životopisech vedení

### Co bylo přeneseno
**CLIENTELO:** tři služby, pětikrokový vznik leadu, tři kroky práce s databází,
tři režimy nakládání s daty, tři oblasti péče o investory, případ z praxe,
dashboard (3 ukazatele + trychtýř 24 800 → 62), osm modulů softwaru, čtyři reference,
čtyři body právního postavení, tři kroky spolupráce, šest častých dotazů, čísla 10+/200+/1/24-7.

**STRAT3X:** 3× růst a 15+ let, čtyři čísla (30+, 120 mil, 1,2 mld, 720 tis+),
kdo jsme / kdo nejsme, čtyři grafy růstu (3,1× až 5,8×, vykreslené jako SVG),
šest oblastí ekosystému, čtyři fáze metodiky, čtyři datové moduly + čtyři platformy,
tři typy ideálních partnerů s cílovým obratem, vedení bez jmen, tři složky cenového
modelu, tým a kapacity, osm častých dotazů.

### Ověřeno
- obě stránky se načtou, 0 chybějících souborů, 0 rozbitých odkazů
- z každé z devíti stránek se návštěvník dostane na všechny ostatní
- 46 ikon se vykresluje, 0 nevykreslených
- menu se vejde i při 900 px (šest položek)
- na telefonu nic nepřetéká do stran
- funguje světlý i tmavý režim včetně grafů

### Zatím NEuděláno (čeká na pokyn)
- nahrání na GitHub
- nasazení na clarix.cz
