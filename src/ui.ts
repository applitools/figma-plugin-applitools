console.log("UI")
document.getElementById('save').onclick = () => {
  console.log("****save******")
  if ((<HTMLInputElement>document.getElementById('key')).value.length > 0 && (<HTMLInputElement>document.getElementById('url')).value.length > 0) {
    var everything = (<HTMLInputElement>document.getElementById('everything')).checked;
    debugger;
    parent.postMessage({ pluginMessage: { type: 'SAVE', everything: everything } }, '*')
  }
  else {
    parent.postMessage({ pluginMessage: { type: 'KEY_OR_URL_ERROR' } }, '*')
  }
}

const {Eyes, Target, Configuration, BatchInfo} = require('@applitools/eyes-images')

document.getElementById('cancel').onclick = () => {
  console.log("****cancel******")
  parent.postMessage({ pluginMessage: { type: 'CANCEL' } }, '*')
}

onmessage = event => {
  let message = event.data.pluginMessage;
   
  if (message.results) {
    console.log("we have data");
    (async () => {
      const testResults =  upload(message.results);
    })();
    parent.postMessage({ pluginMessage: { type: 'UPLOAD_COMPLETE' } }, '*')

  }
}

async function upload(results) {
  console.log('Uploading to Applitools');
  const configuration = new Configuration();
  configuration.setApiKey((<HTMLInputElement>document.getElementById('key')).value);
  configuration.setServerUrl((<HTMLInputElement>document.getElementById('url')).value);
  configuration.setBatch(new BatchInfo('Figma Designs'));
  return await Promise.allSettled(
      results.designs.map(async (design) => {
        let testResults

        const eyes = new Eyes()
        try {
            eyes.setConfiguration(configuration);
            eyes.setBaselineEnvName(`${design.name}`)
            await eyes.open('Figma App', design.name + ' ' + design.id, { width: design.width, height: design.height });
            await eyes.check(design.name + ' ' + design.id, Target.image(Buffer.from(design.bytes)));

            testResults = await eyes.close(false);
            console.log(testResults);
        } catch (e) {
            console.error(e);
            await eyes.abortIfNotClosed();
        }
        return testResults
      }), 
    );
}
