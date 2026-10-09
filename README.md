# Kod Dili Tespit Motoru

HTML sayfalarındaki kod blokları için sıfırdan yazılmış, basit ve modüler bir TypeScript dil tespit motoru. Tarayıcıda ve Node.js ortamında çalışır. Çalışma zamanı bağımlılığı yoktur; hazır dil tespiti, syntax highlighting, grammar, AST veya yapay zekâ kütüphanesi kullanılmaz.

Desteklenen diller: HTML, CSS, JavaScript, TypeScript, PHP, Python, SQL, JSON, XML, Java, C, C++ ve C#.

## Kurulum ve çalıştırma

Node.js 22 veya üzeri ve npm kullanın.

```sh
npm install
npm run build
npm test
npm run demo
```

Demo adresi: `http://127.0.0.1:4173`. Sunucuyu durdurmak için `Ctrl+C` kullanın. Başka bir port için `PORT` ortam değişkenini ayarlayın. Demo, ES modüllerini yüklediği için HTML dosyasını doğrudan `file://` üzerinden açmak yerine bu sunucuyu kullanın.

`npm run typecheck`, çıktı üretmeden strict TypeScript kontrolü yapar. Yalnızca geliştirme bağımlılıkları vardır: TypeScript derleyicisi ve DOM testlerinde kullanılan LinkeDOM. LinkeDOM motorun veya demonun çalışma zamanı bağımlılığı değildir; ürün HTML stringlerini ayrıştırmaz.

## Kod metninden tespit

```ts
import { detectLanguage } from './dist/index.js';

const result = detectLanguage(`
  const message = "Hello";
  console.log(message);
`);

console.log(result.language); // javascript
console.log(result.score);    // 6
console.log(result.reasons);  // eşleşen kurallar ve puanları
```

Bu fonksiyon DOM'a erişmez. Node.js içerisinde aynı şekilde kullanılabilir. ESM çıktısı ve TypeScript tip bildirimleri `dist/` klasöründedir. CommonJS tüketicileri Node.js'in dinamik `import()` fonksiyonunu kullanabilir.

## DOM üzerindeki kod blokları

```ts
import { detectCodeBlocks } from './dist/index.js';

const blocks = detectCodeBlocks(); // varsayılan: document
// detectCodeBlocks(document.querySelector('#examples')!)

for (const block of blocks) {
  console.log(block.language, block.source, block.score);
  console.log(block.element, block.codeElement, block.code);
}
```

- `<pre>` öğeleri taranır; `<pre><code>` tek bloktur. Inline `<code>` taranmaz.
- Bir `<pre>` kökü doğrudan verildiğinde o öğe de dahil edilir. İç içe `<pre>` öğelerinde yalnızca dış blok alınır.
- İçerik `<pre>.textContent` üzerinden okunur. Boşluklar korunur ve HTML entity'leri DOM tarafından çözülür. Örnek HTML kodunu sayfada `&lt;` ve `&gt;` ile yazın.
- Sonuç, gelecekte bir etiketleme katmanı eklenebilmesi için DOM öğesi referanslarını içerir. Motor içerikte veya DOM'da değişiklik yapmaz, örnek kodları çalıştırmaz.
- Node.js ortamında `detectCodeBlocks()` için DOM uyumlu bir kök verilmelidir. Kök olmadan çağrılırsa açıklayıcı hata üretir; metin analizi için `detectLanguage()` yeterlidir.

### Metadata önceliği

Önce ilk iç `<code>` öğesinin, ardından `<pre>` öğesinin metadata bilgisi kontrol edilir. Her öğede sıralama:

1. `data-language`
2. `data-lang`
3. `lang`
4. `class`

Class değerleri boşlukla ayrılır; `language-php`, `lang-ts` ve doğrudan `js` gibi token'lar tanınır. Dil adları ve alias'lar büyük/küçük harfe duyarsızdır. `js`, `ts`, `py`, `cpp`, `c++`, `cs`, `c#` gibi kısaltmalar desteklenir. Tanınmayan değerler atlanır; geçerli metadata yoksa içerik analiz edilir. Çakışma durumunda bu sıradaki ilk geçerli bilgi kullanılır.

Metadata sonucu içerik puanlanmadan döndürülür: `source: "metadata"`, `score: 0`, `candidates: []`. Metadata puanı sıfırdır çünkü bu aşama bir bildirim okur; bir tahmin puanı üretmez. Metadata nedeninde hangi öğe ve özniteliğin kullanıldığı belirtilir.

## Puanlama ve belirsizlik

Her dil dosyası belirleyici yapılara puan verir. Açık PHP etiketi veya doğrulanmış JSON belgesi gibi güçlü işaretler 10, karakteristik yapılar genellikle 5, destekleyici ifadeler 1–3 puan alır. Her kural blok başına yalnızca bir kez puanlanır; aynı kelimenin tekrarları puanı şişirmez.

Varsayılan karar koşulları:

1. En yüksek puan en az **5** olmalı.
2. Adayda en az bir karakteristik birleşik yapı veya en az iki ayrı kural eşleşmesi olmalı.
3. En yüksek puan, ikinci adaydan en az **2** puan fazla olmalı.

Koşullar sağlanmazsa sonuç `unknown` olur. Zayıf veya yakın adaylar yine `candidates` içinde puanları ve nedenleriyle tutulur; karar puanı `0`, karar nedenleri `[]` olur. Hiç işaret bulunmazsa aday listesi de boştur. Puanlar istatistiksel güven oranı veya doğruluk yüzdesi değildir.

İçerik sonucu örneği:

```json
{
  "language": "javascript",
  "score": 6,
  "source": "content",
  "candidates": [
    {
      "language": "javascript",
      "score": 6,
      "reasons": [
        { "rule": "js-console", "description": "console metodu çağrısı", "score": 5 },
        { "rule": "js-variable", "description": "const veya let değişken bildirimi", "score": 1 }
      ]
    }
  ],
  "reasons": [
    { "rule": "js-console", "description": "console metodu çağrısı", "score": 5 },
    { "rule": "js-variable", "description": "const veya let değişken bildirimi", "score": 1 }
  ]
}
```

### Benzer diller

- **JavaScript / TypeScript:** Sadece `const value = 1;` gibi ortak bir ifade `unknown` dönebilir. TS'ye özgü tip işaretleri bulunursa JavaScript ile uyumlu kanıtlar TS adayına da eklenir. Böylece tipli kod, çok sayıda JS ifadesi içerdiği için yanlışlıkla JavaScript seçilmez. Tip işareti bulunmayan yeterince belirgin JS örnekleri JavaScript olarak seçilir; TS içinde de geçerli olabilecekleri bilinmektedir.
- **C / C++:** `int main()` gibi ortak yapılar yeterli değildir. C++ işaretleri varsa C başlıkları ve API'leri C++ puanına da katkıda bulunur. C başlıklarını kullanan C++ kodu bu şekilde ayrılır.
- **HTML / XML:** HTML doctype, bilinen HTML etiket çiftleri, XML bildirimi, namespace ve özel etiketler değerlendirilir. Bu bir etiket doğrulayıcısı değildir; ortak yapılar doğaları gereği belirsiz olabilir.
- **JSON / JavaScript:** Tam metin, `JSON.parse()` ile geçerli bir nesne veya dizi olarak doğrulanırsa JSON tercih edilir. JavaScript içine yerleştirilmiş JSON nesnesi tüm metin olarak geçerli JSON değildir. Tek başına sayı, string veya boolean dil belirlemek için yeterli sayılmaz.

Yorum ve string içerikleri basit bir maskeleme geçişiyle çoğu içerik kuralından çıkarılır. Markup ve başlık kuralları gerektiğinde yorumları çıkarılmış metni kullanır. Bu geçiş tam bir lexer değildir; tüm dil kaçışlarını, regex literal'lerini veya template interpolation yapılarını çözmez. Çok kısa, alışılmadık veya karma dil içeren örneklerde `unknown` ya da hatalı tahmin mümkündür. İlk sürüm karma dil analizi yapmaz.

## Yeni dil ekleme

Her dil `LanguageRule` arayüzünü uygular. Basit regex kuralları için `defineLanguage()` yardımcı fonksiyonu vardır:

```ts
import {
  LanguageRegistry, defaultLanguages, defineLanguage,
  createDetector, createCodeBlockDetector,
} from './dist/index.js';

const example = defineLanguage('example', ['ex'], [
  {
    id: 'example-greeting',
    description: 'Example selamlama yapısı',
    score: 5,
    distinctive: true,
    test: /^HELLO\s+WORLD$/,
  },
]);

const registry = new LanguageRegistry([...defaultLanguages, example]);
const detect = createDetector(registry);
const scan = createCodeBlockDetector(registry, detect);

detect('HELLO WORLD'); // example
scan(document);       // data-lang="ex" de tanınır
```

Yeni yerleşik dil için `src/languages/` altında bir dosya ekleyip `src/languages/index.ts` listesine dahil edin. Ana karar algoritması değişmez. Özel kayıt sistemi varsayılan kayıt sisteminden bağımsızdır. `registry.register()` sonrasında aynı kayıt sistemini kullanan detector yeni dili görür. Çakışan ad/alias'lar hata üretir.

Bir kural varsayılan olarak `context.syntax` üzerinde çalışır. `target: "text"` stringleri koruyup yorumları çıkarılmış metni, `target: "code"` orijinal kırpılmış metni seçer. `test`, regex veya boolean döndüren fonksiyon olabilir. Daha özel bir dil doğrudan `detect(context)` uygulayıp `{ rule, description, score, distinctive }` eşleşmelerini döndürebilir.

Eşikler `createDetector(registry, { minimumScore: 5, minimumMargin: 2 })` ile ayarlanabilir. Eşit puanlar her zaman belirsiz kalır.

## Dosya yapısı

```text
src/
  core/         # Tipler, kayıt sistemi, maskeleme ve puanlama
  languages/    # Her dil için bağımsız kurallar
  dom/          # Salt okunur DOM taraması ve metadata
  index.ts      # Node.js / tarayıcı ortak API
  demo.ts       # Vanilla DOM ile demo sonuçlarını gösterme
demo/           # Sade HTML ve CSS
tests/          # Node test runner; içerik ve DOM testleri
scripts/        # Bağımlılıksız yerel demo sunucusu
```

## Test kapsamı

`npm test`, önce strict TypeScript derlemesini, ardından Node.js'in yerleşik test runner'ını çalıştırır. Testler her dil için tek ve çok satırlı örnekleri; boş, ortak ve belirsiz kodları; JS/TS, C/C++, HTML/XML ve JSON/JS ayrımlarını; metadata ve alias önceliğini; entity ve boşluk korunmasını; DOM'un değişmemesini; inline kodun atlanmasını; birden fazla bloğun bağımsız işlenmesini; özel dil kaydını ve demo örneklerini kapsar.

Test örnekleri bir doğruluk ölçümü değildir; genel kullanım için ölçülmemiş doğruluk yüzdesi iddiası yoktur.

Demo sunucusunun entegrasyon testi de ana adresin yönlendirilmesini, CSS ve JavaScript dosyalarının yüklenmesini ve sunucunun yalnızca demo/derleme dosyalarını sunmasını doğrular. Bu test yerel HTTP bağlantısı açar; ağ erişimi kısıtlı ortamlarda test çalıştırıcısına localhost erişimi verilmelidir.
