# V2 doğruluk geliştirmesi

Bu rapor V2 başlangıcının tarihsel sonuçlarını saklar. V2.1'de buradaki üç keşif örneği çözüldü; eski 237 test korunarak toplam 370 test başarılı oldu. Güncel davranışlar, JSX tercihi, karşılaştırma ve kalan iki senaryo [V2.1 kararlılık raporundadır](accuracy-v21-report.md).

Tarih: 9 Ekim 2026. Dal: `feature/v2-accuracy`.
Başlangıç commit'i: `d60628401120ca57949f4ba74e822af98bc90ff9`.
Başlangıç çalışma ağacı temizdi; bu dal zaten mevcuttu.

## Ölçülen sonuçlar

| Kontrol | Başlangıç | V2 |
|---|---:|---:|
| Önceden mevcut testler | 119/119 | 119/119 |
| Bütün testler | 119/119 | 237/237 |
| Orijinal tek/çok satırlı dil örnekleri | 26/26 | 26/26 |
| Yeni sabit regresyon örnekleri | 60/102 (%58,82) | 102/102 (%100) |
| Ek keşif örnekleri | 0/3 | 0/3 |
| Yeni örnekler + keşif örnekleri | 60/105 (%57,14) | 102/105 (%97,14) |
| TypeScript strict tip kontrolü | Başarılı | Başarılı |

102 örneklik regresyon kümesinde **42 ek doğru sonuç**, **41,18 yüzde puan** artış ölçüldü. Keşif örnekleri dahil artış **40 yüzde puan**. 20 `unknown` örneğindeki yanlış dil atamaları **10'dan 0'a** düştü. Başlangıçta doğru olan 60 yeni örneğin tamamı V2'de doğru kaldı.

Bu örnekler geliştirme sırasında kullanılan seçilmiş bir regresyon kümesidir; bağımsız bir test kümesi veya genel kullanım doğruluğu iddiası değildir. Çözülmemiş üç keşif örneği toplu karşılaştırmada açıkça gösterilir; test runner içinde başarılı, atlanmış veya bekleyen test olarak gösterilmezler.

| Beklenen dil | Başlangıç | V2 |
|---|---:|---:|
| JavaScript | 3/8 | 8/8 |
| TypeScript | 3/8 | 8/8 |
| C | 4/6 | 6/6 |
| C++ | 4/7 | 7/7 |
| Java | 2/7 | 7/7 |
| C# | 5/7 | 7/7 |
| HTML | 3/6 | 6/6 |
| XML | 3/6 | 6/6 |
| JSON | 5/5 | 5/5 |
| CSS | 5/5 | 5/5 |
| Python | 4/6 | 6/6 |
| PHP | 5/5 | 5/5 |
| SQL | 4/6 | 6/6 |
| unknown | 10/20 | 20/20 |

## Uygulanan iyileştirmeler

- **JavaScript / TypeScript:** Nesne alanlarında `name: string` gibi değerler ve `import { number as string }` alias'ları artık TS anotasyonu sayılmaz. Fonksiyon parametreleri, generic fonksiyonlar/arrow'lar, interface alanları, özel tip dönüşümleri ve `satisfies` tanınır. TS kanıtı bulunduğunda JS ile uyumlu kuralların katkısı korunur. CommonJS ve async/await bileşik yapıları JS tespitini güçlendirir.
- **C / C++:** C başlığını ve `printf` kullanan C++ sınıfları erişim bölümleriyle ayrılır; `constexpr` tanınır. C++ için C başlık/API kanıtlarının aktarımı korunur. C11 `_Static_assert`/`_Generic` ve struct alanlarıyla başlatma desteklenir. String içindeki sahte `#include` satırları başlık kanıtı sayılmaz.
- **Java / C#:** Java paket + tip gövdesi, erişim belirteçli kalıtım ve `throws`; C# async Task ve noktalı virgülle biten positional record yapıları eklendi. JS/TS ile ortak, tek başına `class ... extends` veya `implements` ifadeleri dil seçtirmez.
- **HTML / XML:** XML bildirimi ve kök namespace'i HTML etiketlerinden önceliklidir. HTML doctype ile web component'ler HTML kalır. Öznitelik içindeki sahte etiketler ve CDATA içeriği ayıklanır. HTML içinde script/style veya iç SVG namespace'i dış belgenin dilini değiştirmez.
- **JSON / JavaScript:** Tam metni doğrulayan mevcut `JSON.parse` nesne/dizi kuralı korundu. JSON içinde yanıltıcı kod stringleri, JS içine yerleştirilmiş JSON, geçersiz virgül ve yorumlu JSON örnekleri eklendi. JSON örneklerinde 5/5 sonucu korunurken JS nesnelerinin yanlış TS atanması düzeltildi.
- **Maskeleme:** Boşluksuz/inline hash ve SQL yorumları, kapanmamış stringler, C#/C++ raw/verbatim stringler ve yaygın JS regex literal bağlamları ele alındı. CSS seçicileri/hex renkleri, C yönergeleri, bölme ve decrement ifadeleri için koruma testleri eklendi.
- **unknown:** Ortak nesne alanları, yalnız alias import, eksik karakteristik çağrılar ve sorgu olmayan SELECT/FROM cümleleri güçlü kanıt olmaktan çıkarıldı. Eşikler 5 puan ve 2 puan fark olarak korundu; adaylar ve gerekçeler belirsiz sonuçta da görünür.
- **Puan tekrarları:** Eşdeğer kurallar `group` ile tek kanıt olarak puanlanır; grupta en yüksek puan kullanılır. Eşit puanda karakteristik eşleşme korunur. Özel kuralların döndürdüğü yinelenen kural kimlikleri de tek kez sayılır. `std::cout` puanı 10 → 5; `export interface Item {}` puanı 7 → 5; `const count: number = 1;` puanı 10 → 5 oldu. Tekrarlanan kod sonucu/puanı değiştirmez.

## Eklenen testler ve uyumluluk

Toplam **118 yeni test** eklendi: 102 etiketli regresyon örneği, 15 kapsam/puanlama/maskeleme/API koruma testi ve 1 DOM entegrasyon testi. Her mevcut dil için 5–8 gerçekçi örnek var. Dosya okuma/bellek ayırma, sınıflar, generic tipler, async görevler, formlar, namespace'ler, iç içe JSON, CSS seçicileri, Python fonksiyonları, PHP closure'ları ve SQL JOIN/CTE örnekleri kapsanıyor.

Mevcut API fonksiyonları, `DetectionResult` ve `DetectionContext` alanları, alias'lar ve metadata önceliği korundu. `Pattern.group` geriye uyumlu, isteğe bağlı bir alandır. Özel kuralların markup syntax'ını görmeye devam ettiği ayrıca test edildi. DOM taraması belgeyi değiştirmez. Demonun 15 örneği, yerel sunucunun HTML/CSS/modül yüklemesi ve erişim sınırları mevcut testlerle doğrulandı. Demo dosyaları ve bağımlılıklar değiştirilmedi; desteklenen dil sayısı 13.

## Çözülmemiş ölçülen senaryolar

| Örnek | Beklenen | Başlangıç | V2 | Neden |
|---|---|---|---|---|
| `` `result: ${console.log(1)}` `` | JavaScript | unknown | unknown | Template literal bütünüyle maskelenir; interpolation ayrıca analiz edilmez. |
| `const view = <Widget />;` | JavaScript | unknown | unknown | Tek başına JSX ve ortak değişken bildirimi yeterli dil kanıtı sağlamaz. |
| `match command:` altında `case "quit": exit()` | Python | unknown | unknown | Mevcut Python kuralları bu tek başına pattern matching bloğunu kapsamaz. |

Maskeleme tam lexer, markup analizi XML/HTML doğrulayıcısı değildir. Alışılmadık regex bağlamları, tüm raw string ayırıcıları ve karma dilli belgelerin ayrı bölümleri için genel doğruluk garantisi yoktur.

## Ölçümü tekrar çalıştırma

```sh
npm test
npm run typecheck
node scripts/measure-accuracy.mjs dist/index.js docs/accuracy-v2.json feature/v2-accuracy
```

Başlangıç commit'inin ayrı dizinde derlenmiş `dist/index.js` dosyası ilk argüman olarak verilerek aynı ölçüm betiği başlangıç sürümünü de ölçebilir. Başlangıç ölçümü, değişikliklerden önce alınmış derleme çıktısıyla çalıştırıldı. Aynı betik ve aynı fixture dosyası iki sürüm için kullanıldı. JSON çıktılarında fixture SHA-256 değeri, Node sürümü, sürüm etiketi, her örneğin beklenen/gerçek dili ve puanı saklanır:

- [Başlangıç sonuçları](accuracy-baseline.json)
- [V2 sonuçları](accuracy-v2.json)
- [Sabit örnekler](../tests/accuracy-fixtures.mjs)
- [Ölçüm betiği](../scripts/measure-accuracy.mjs)

Değişiklikler `feature/v2-accuracy` çalışma ağacında tutuldu. Birleştirme, push veya sürüm etiketi oluşturma yapılmadı.
