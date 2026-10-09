# V2.1 — Kararlılık ve eksik senaryolar

Tarih: 9 Ekim 2026. Dal: `feature/v2-accuracy`.

Başlangıçta V2 raporu, kurallar, context maskelemesi, aday puanlama/eşikler, kayıt sistemi, metadata/DOM akışı ve testler incelendi. V2 çalışma ağacı henüz commit edilmemişti; mevcut değişiklikler korundu. HEAD ve main `d60628401120ca57949f4ba74e822af98bc90ff9` olarak kaldı. V2 başlangıç derlemesi değişikliklerden önce ayrı dizine kopyalanarak aynı yeni fixture'larla ölçüldü. V2 başlangıcında **237/237 test** ve strict TypeScript kontrolü başarılıydı.

## Sonuçların karşılaştırması

| Kontrol | V2 başlangıcı | V2.1 |
|---|---:|---:|
| Mevcut 237 test | 237/237 | 237/237 |
| Bütün testler | 237/237 | 370/370 |
| Orijinal tek/çok satırlı dil örnekleri | 26/26 | 26/26 |
| V2 sabit regresyon kümesi | 102/102 | 102/102 |
| V2'nin üç keşif senaryosu | 0/3 | 3/3 |
| Yeni V2.1 sabit örnekleri | 59/123 (%47,97) | 123/123 (%100) |
| İleri keşif örnekleri | 0/2 | 0/2 |
| Yeni küme + ileri keşif örnekleri | 59/125 (%47,20) | 123/125 (%98,40) |
| Strict TypeScript kontrolü | Başarılı | Başarılı |

Yeni sabit kümede **64 ek doğru sonuç**, **52,03 yüzde puan** artış ölçüldü. Başlangıçta doğru olan 59 yeni örnek de korundu. İleri keşifler dahil artış **51,20 yüzde puan**. Bunlar seçilmiş geliştirme/regresyon örnekleridir; genel doğruluk veya bağımsız doğrulama ölçümü değildir. Önceki üç keşif testi ayrıca çalıştırılır; aynı temel örnekler geniş özellik kümesinde de bulunduğundan bu iki satırın toplamı bağımsız örnek sayısı olarak yorumlanmamalıdır.

| Özellik kümesi | V2 | V2.1 |
|---|---:|---:|
| Template literal/interpolation ve dil ayrımları | 17/31 | 31/31 |
| JSX/TSX, yanıltıcı içerik ve benzer dil ayrımları | 21/53 | 53/53 |
| Python match/case ve benzer dil ayrımları | 21/39 | 39/39 |

## Template literal davranışı

Normal template metni maskelenir. Tamamlanmış `${...}` ifadelerinde gerçek kod mevcut maskeleme/puanlama kurallarına girer. İç içe `{}`, `()` ve `[]` takip edilir; string, yorum, regex ve nested template içindeki kapanış işaretleri ifadeyi erken bitiremez. JSX içindeki normal metin de expression sınırını kapatamaz. `${...}` işaretleri syntax görünümünde tutulur; ifade içindeki JSX'in kod bağlamı korunur.

Başarılı örnekler: console çağrısı, birden fazla interpolation, nested template, object/IIFE, regex character class ve `}` literal'i, inline/blok yorumları, bölme/decrement, tagged template, TS anotasyonu/assertion, interpolation içinde JSX ve JSX metnindeki apostrof.

Olumsuz kontroller: sadece düz template metni, normal quoted string içindeki `${...}`, escape edilmiş interpolation/backtick, boş ifade, kapanmamış template/ifade, dengesiz parantez, yorum/string içinde sahte kod ve tek başına zayıf `user.name` ifadesi. Kaçışların tek/çift backslash durumları ayrı test edilir. Bağımsız SQL sorgusunda backtick ile yazılmış identifier içerikleri maskeli kalır; `sql` adlı JS tagged template'in gerçek ifadeleri analiz edilir.

Kod çalıştırılmaz. Derinlik sınırı 64'tür; tamamlanmamış veya sınırı aşan template, içeriğini puanlamaya sızdırmadan maskelenir. Interpolation varlığı tek başına güçlü JS kuralı değildir; karar gerçek ifade kanıtı ve mevcut eşiklere dayanır.

## JSX ve TypeScript tercihi

JSX için tamamlanmış açılış/kapanış veya self-closing yapı aranır. Atama, return, çağrı/array, arrow veya ifade statement bağlamları değerlendirilir. Fragment'ler ve props/children expression container'ları da JSX kanıtıdır. İç içe etiketler, dotted/namespaced bileşen adları, boolean/spread props, map children, semicolonsuz kod, nested JSX ve generic bileşen tipleri desteklenir.

**Proje varsayılanı:** JSX kanıtı varsa ve güçlü TS işareti yoksa JavaScript seçilir. Aynı JSX TS içinde de geçerlidir; bu, dosya uzantısını tahmin eden bir kural değildir. TS anotasyonu, JSX yanında interface veya fonksiyon/metot dönüş tipi, tip dönüşümü veya component generic tip parametresi varsa TS'ye özgü kurallar devreye girer ve JS/JSX ile uyumlu puanlar TS adayına da aktarılır. Örnek: `const view = <Widget />` → JavaScript; `const view: Element = <Widget />` ve `function App(): JSX.Element { return <Widget />; }` → TypeScript.

Sadece `<div>Hello</div>` veya `<Widget />` gibi bağımsız düz markup, mevcut dış-belge tercihine göre HTML/XML kalır. JSX yorumunu seçmek için ek kod/JSX işareti gerekir. XML bildirimi, root namespace, HTML doctype, script/style ve CDATA önceliği korunur. `<T>value`, karşılaştırma ifadeleri, eksik/mismatched etiket ve geçersiz boş prop expression gibi örnekler güçlü JSX kanıtı üretmez; yeterli başka kanıt yoksa `unknown` kalırlar.

Text node'lar, literal props ve yorumlar keyword puanı oluşturmaz. JSX expression container'larındaki gerçek kod korunur. Apostrof ve çift tırnak içeren normal JSX metni bir JS string'i gibi kapanış etiketini tüketmez. `import`/`export` alias'ları TS assertion sayılmaz; Python import alias'ı ve PHP foreach ayrımları da test edilir. Yeni function/interface kanıtları mevcut evidence gruplarıyla tekrar puanlanmaz. Syntax, text ve code uzunlukları ile newline konumları korunur.

## Python match/case davranışı

`match <subject>:` başlığı ile ilk gerçek `case <pattern>:` dalı birlikte aranır. Case daha derin girintide olmalı; inline gövde veya daha derin girintili ilk statement bulunmalıdır. Yorum ve boş satırlar atlanır. Tab girintisi sekiz sütunluk duraklarla değerlendirilir. Mapping/sequence, class/capture, wildcard, alternative ve guarded pattern'ler desteklenir. Ayırıcı colon, dengeli grouping dışından alınır; mapping içindeki veya inline body içindeki colon başlığı yanlış bölmez. Parantez/bracket/brace ile devam eden başlıklar en fazla 64 satır birleştirilir.

Tek başına `match`/`case`, aynı seviyede girinti, eksik subject/pattern/body/colon, dengesiz grouping, araya başka statement girmesi ve yorum/docstring içindeki sahte bloklar yeni kuralı etkinleştirmez. JS `.match()` çağrısı, TS `match`/`case` property adları, Java/C# switch, SQL CASE ve Rust benzeri brace/arrow match ifadeleri ayrı test edilir. Yakın puanlı karışık kanıt `unknown` olarak kalır. Bu kontrol bütün bir Python dosyasının grammar doğrulaması değildir.

## Testler ve uyumluluk

**133 test eklendi:** 123 etiketli özellik örneği, önceki üç keşif örneği için üç assertion, altı kararlılık/güvenlik/context testi ve bir DOM entegrasyon testi. Önceki 237 testin dosyaları ve beklenen sonuçları korunmuştur.

Kararlılık testleri; newline/offset hizası, tekrar eden yapıların aynı puanı üretmesi, düz metinden Java/C#/TS keyword kanıtı oluşmaması, aşırı nested input, kodun çalıştırılmaması, çatışan adaylarda `unknown`, Python docstring/comment ayrımı ve DOM metadata önceliğini doğrular. Mevcut demo sunucusu, 15 demo örneği, DOM'un değişmemesi ve metadata/alias testleri de geçer. Bütün testlerde **0 fail, 0 skipped, 0 todo** bulunur.

Desteklenen dil sayısı 13'tür. Yeni dil, runtime/geliştirme bağımlılığı, harici API, hazır tespit/highlighting kütüphanesi, AST veya AI analizi eklenmedi. Public API imzaları ve result/context alanları korunur. Ana karar algoritması, puan eşiği 5, fark eşiği 2, kayıt sistemi, metadata akışı ve demo dosyaları değiştirilmedi. Çalışma mevcut context ve dil kurallarına eklenen sınırlı yapısal taramayla yürütüldü.

## Başarısız kalan ölçülen senaryolar

| Senaryo | Beklenen | V2 | V2.1 | Açıklama |
|---|---|---|---|---|
| `const view = <Select<"compact"> />;` | TypeScript | unknown | unknown | Generic JSX taraması quoted string literal tip argümanını kapsamaz. |
| `` `value ${(() => { if (ready) /}/.test(value); console.log(1); })()}` `` | JavaScript | unknown | unknown | Kontrol parantezinden sonra başlayan regex, sınırlı expression boundary taramasında division/regex ayrımını aşar; yanlış içerik açmamak için template maskelenir. |

Bu iki örnek ölçüm çıktılarının `remaining` bölümündedir; test runner'da başarı veya skipped test olarak sayılmaz. İki senaryoda da yanlış dil ataması yerine `unknown` üretilir. Full lexer/JSX/Python grammar desteği iddia edilmez; syntax tamamen doğrulanmaz ve tüm alışılmadık biçimler kapsanmaz.

## Yeniden ölçüm ve kayıtlar

```sh
npm test
npm run typecheck
node scripts/measure-accuracy.mjs dist/index.js docs/accuracy-v21.json V2.1
```

Aynı betik, V2 başlangıç snapshot'ının ayrı derlenmiş `index.js` dosyası ilk argüman verilerek V2 sonuçlarını yeniden ölçer. Başlangıç snapshot'ı V2 çalışma ağacından alındı; commit kimliği V2 içeriğinin kimliği olarak kullanılmadı. JSON dosyalarında Node sürümü, tüm derlenmiş JS modüllerinin SHA-256 özeti, her iki fixture dosyasının SHA-256 özeti, aday karar puanı ve her örneğin beklenen/gerçek dili bulunur.

- [V2.1 başlangıç ölçümü](accuracy-v21-baseline.json)
- [V2.1 son ölçümü](accuracy-v21.json)
- [Özellik ve ileri keşif örnekleri](../tests/v21-fixtures.mjs)
- [Özellik/kararlılık testleri](../tests/v21.test.mjs)
- [DOM entegrasyon testi](../tests/v21-dom.test.mjs)
- [Ölçüm betiği](../scripts/measure-accuracy.mjs)
- [Tarihsel V2 raporu](accuracy-report.md)

Değişiklikler mevcut `feature/v2-accuracy` çalışma ağacında tutulur. main merge, GitHub push veya yeni tag oluşturma yapılmadı.
