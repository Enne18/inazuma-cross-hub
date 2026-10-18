/* Elementi grafici condivisi: avatar del personaggio = pastiglia (sempre presente) + immagine sopra (se carica).
   Le immagini sono collegate all'indirizzo originale del sito dei dati (hotlink): se vengono bloccate o spostate resta la pastiglia.
   L'utente può spegnerle con l'interruttore "Mostra immagini" (salvato nel browser). */
(function () {
  'use strict';
  var IMG_BASE = 'https://inazumaelevencrosshub.com';
  var KEY = 'iecross.images.v1';
  function imagesOn() { try { return window.localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } }
  function setImages(on) { try { window.localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* ignora */ } }

  // c: personaggio (con image_small/image_big, element, position, rarity, name_ja). size: 'sm' | 'md' | 'lg'
  function avatar(c, size) {
    var a = document.createElement('div');
    a.className = 'avatar ' + (size || 'md');
    a.style.setProperty('--el', 'var(--' + c.element + ')');
    var ini = document.createElement('span'); ini.className = 'ini'; ini.textContent = (c.name_ja || '?').charAt(0);
    var pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = c.position;
    var st = document.createElement('span'); st.className = 'stars'; st.textContent = '★'.repeat(c.rarity || 0);
    a.appendChild(ini); a.appendChild(pos); a.appendChild(st);
    var src = size === 'lg' ? (c.image_big || c.image_small) : (c.image_small || c.image_big);
    if (src && imagesOn()) {
      var img = document.createElement('img');
      img.loading = 'lazy'; img.decoding = 'async'; img.alt = ''; img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', function () { img.remove(); });
      img.addEventListener('load', function () { a.classList.add('has-img'); });
      img.src = IMG_BASE + src;
      a.appendChild(img);
    }
    a.title = c.name_ja + ' · ' + c.position + ' · ' + '★'.repeat(c.rarity || 0);
    return a;
  }
  window.IECUI = { avatar: avatar, imagesOn: imagesOn, setImages: setImages };
})();
