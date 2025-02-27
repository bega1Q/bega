/*
 * Dependencies:
 *
 * GM_info(optional)
 * Docs: https://violentmonkey.github.io/api/gm/#gm_info
 * 
 * GM_xmlhttpRequest(optional)
 * Docs: https://violentmonkey.github.io/api/gm/#gm_xmlhttprequest
 *
 * JSZIP
 * Github: https://github.com/Stuk/jszip
 * CDN: https://unpkg.com/jszip@3.7.1/dist/jszip.min.js
 *
 * FileSaver
 * Github: https://github.com/eligrey/FileSaver.js
 * CDN: https://unpkg.com/file-saver@2.0.5/dist/FileSaver.min.js
 */

;const ImageDownloader = (({ JSZip, saveAs }) => {
  let maxNum = 0;
  let promiseCount = 0;
  let fulfillCount = 0;
  let isErrorOccurred = false;

  // elements
  let startNumInputElement = null;
  let endNumInputElement = null;
  let downloadButtonElement = null;
  let panelElement = null;

  // initialization
  function init({
    maxImageAmount,
    getImagePromises,
    title = `package_${Date.now()}`,
    zipOptions = {},
    positionOptions = {}
  }) {
    maxNum = maxImageAmount;
    setupUI(positionOptions);
    setupUpdateNotification();
    downloadButtonElement.onclick = function () {
      if (!isOKToDownload()) return;
      this.disabled = true;
      this.textContent = "Processing";
      this.style.backgroundColor = '#aaa';
      this.style.cursor = 'not-allowed';
      download(getImagePromises, title, zipOptions);
    };
  }

  async function download(getImagePromises, title, zipOptions) {
    const startNum = Number(startNumInputElement.value);
    const endNum = Number(endNumInputElement.value);
    promiseCount = endNum - startNum + 1;
    let images = [];

    for (let num = startNum; num <= endNum; num += 4) {
      const from = num;
      const to = Math.min(num + 3, endNum);
      try {
        const result = await Promise.all(getImagePromises(from, to));
        images = images.concat(result);
      } catch (error) {
        return;
      }
    }

    JSZip.defaults.date = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000);
    const zip = new JSZip();
    const zipTitle = title.replaceAll(/\/|\\|\:|\*|\?|\"|\<|\>|\|/g, '');
    const folder = zip.folder(zipTitle);

    for (const [index, image] of images.entries()) {
      const webpImage = await convertToWebP(image);
      const filename = `${String(index + 1).padStart(2, '0')}.webp`;
      folder.file(filename, webpImage, zipOptions);
    }

    const zipProgressHandler = (metadata) => {
      downloadButtonElement.innerHTML = `Zipping<br>(${metadata.percent.toFixed()}%)`;
    };
    const content = await zip.generateAsync({ type: "blob" }, zipProgressHandler);
    saveAs(content, `${zipTitle}.zip`);
    downloadButtonElement.textContent = "Completed";
  }

  function convertToWebP(imageBlob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(resolve, 'image/webp', 0.8);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(imageBlob);
    });
  }

  return { init };
})(window);
