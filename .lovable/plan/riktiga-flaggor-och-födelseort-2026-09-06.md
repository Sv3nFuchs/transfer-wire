# Riktiga flaggor och födelseort

## Det här ändras
- Ersätt emoji-flaggorna med riktiga, lokalt paketerade flaggbilder med fast form och tydlig alt-text.
- Visa spelarens nationalitetsflaggor endast på den egna spelarprofilen; ta bort dem från både den allmänna spelarlistan och klubbarnas trupplistor.
- Lägg till födelseort och födelseland för spelare. På profilen visas orten tillsammans med födelselandets flagga.
- Visa respektive klubbs landsflagga bredvid klubbnamnet i varje rad i övergångshistoriken.
- Låt admin välja födelseland och klubbens land via landlistan, både när poster skapas och redigeras.
- Lägg till svenska och engelska texter för de nya profiluppgifterna.

## Data och befintligt innehåll
- Lägg till `birthplace` och `birth_country_code` på spelare samt `country_code` på klubbar.
- Befintliga svenska och amerikanska klubbar får landkod automatiskt utifrån nuvarande landnamn. Befintliga spelare lämnas utan födelseort tills den fylls i av admin.
- Befintliga två nationalitetsflaggor behålls som separata val och visas som riktiga flaggbilder på spelarprofilen.

## Kontroll
- Kontrollera att profil, spelarlista, klubblag och övergångshistorik ser rätt ut på både dator och mobil.
- Kontrollera att admin kan spara de nya fälten och att svenska/engelska vyer fungerar.
