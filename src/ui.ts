console.log("UI")
document.getElementById('save').onclick = () => {
  console.log("****save******")
  if ((<HTMLInputElement>document.getElementById('key')).value.length > 0 && (<HTMLInputElement>document.getElementById('url')).value.length > 0) {
    var allComponents = (<HTMLInputElement>document.getElementById('everything')).checked;
    parent.postMessage({ pluginMessage: { type: 'SAVE', everything: allComponents } }, '*');
  }
  else {
    parent.postMessage({ pluginMessage: { type: 'KEY_OR_URL_ERROR' } }, '*')
  }
}

const {Eyes, Target, Configuration, BatchInfo} = require('@applitools/eyes-images')

document.getElementById('cancel').onclick = () => {
  console.log("User Cancelled")
  parent.postMessage({ pluginMessage: { type: 'CANCEL' } }, '*')
}

onmessage = event => {
  let message = event.data.pluginMessage;
   
  if (message.results) {
    console.log("Designs Collected");
    (async () => {
      let batchUrls;
      let statusCounter = {}
      await upload(message.results).then(function (tresults) {
  
        try{
          //IDK why it's complaining _appUrls and _status do not exist. code works though...
          batchUrls = tresults.map(test => test._appUrls._batch).filter((item, i, ar) => ar.indexOf(item) === i)
          tresults.map(test => test._status).forEach(function(obj) {
            var key = JSON.stringify(obj)
            statusCounter[key] = (statusCounter[key] || 0) + 1
          })
        } catch {
          batchUrls = []
          statusCounter = {}
        }
        
        console.log(`\nBatch Url: ${batchUrls.join('')}\n`)
        console.log(`Test Results: ${JSON.stringify(statusCounter)}\n`)

        //debugger;
        parent.postMessage({ pluginMessage: { type: 'UPLOAD_COMPLETE' } }, '*')
      })
    })();
  }
}

async function upload(results) {
  
  console.log('Uploading to Applitools');
  const configuration = new Configuration();
  configuration.setApiKey((<HTMLInputElement>document.getElementById('key')).value);
  configuration.setServerUrl((<HTMLInputElement>document.getElementById('url')).value);
  
  // if ((<HTMLInputElement>document.getElementById('proxy')).value) {
  //   var proxyUrl = (<HTMLInputElement>document.getElementById('proxy')).value
  //   let proxyInfo = {
  //     url: proxyUrl,
  //     username: null, 
  //     password: null, 
  //     isHttpOnly: true
  //   };
  //   console.log("Setting Proxy: " + proxyInfo)
  //   configuration.setProxy(proxyInfo);
  //   configuration.setProxy(new ProxySettings('http://127.0.0.1:8080', undefined, undefined, true))
  // }

  let projectName = `Figma - ${results.project}`

  configuration.setBatch(new BatchInfo(projectName));
  
  return await Promise.all(
    
    await results.designs.map(async (design) => {
      let testResults;
      let testName = `${design.name} - ${design.id}`

      const eyes = new Eyes()
 
      try {
          eyes.setConfiguration(configuration);

          //Set Proxy if entered...
          var proxyUrl = (<HTMLInputElement>document.getElementById('proxy')).value
          if (proxyUrl) {
            console.log("Setting Proxy: " + proxyUrl)
            eyes.setProxy(proxyUrl);
          }

          eyes.setHostOS(`${projectName}`)
          eyes.setBaselineEnvName(`${testName}`)
          await eyes.open(projectName, testName, { width: design.width, height: design.height });
          await eyes.check(testName, Target.image(Buffer.from(design.bytes)));

          testResults = await eyes.close(false);

          //console.log(testResults);
      } catch (error) {
          console.log(error); //Doesn't report an error...
          await eyes.abortIfNotClosed();
      }
      
      return testResults;
  
    })
  )
}
