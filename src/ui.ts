import { randomBytes } from "crypto";

const {
  MatchLevel,
  AccessibilityLevel,
  AccessibilityGuidelinesVersion,
  Region,
  ImageMatchSettings,
  ExactMatchSettings,
  Eyes, 
  Target, 
  Configuration, 
  BatchInfo
} = require('@applitools/eyes-images')

const axios = require('axios')
const qs = require('qs');

document.getElementById('save').onclick = () => {
  console.log("****save******");

  (<HTMLInputElement>document.getElementById('key')).value = 'vFTR101InkcBkWd4111aMd6Ge2DrimdbdY003W8zB1jRR5E110';

  if ((<HTMLInputElement>document.getElementById('key')).value.length > 0) {
    // figma.clientStorage.setAsync('apiKey', (<HTMLInputElement>document.getElementById('key')).value)
    var allComponents = (<HTMLInputElement>document.getElementById('everything')).checked;
    parent.postMessage({ pluginMessage: { type: 'SAVE', everything: allComponents } }, '*');
  }
  else {
    parent.postMessage({ pluginMessage: { type: 'KEY_OR_URL_ERROR' } }, '*')
  }
}

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

async function getApiflashImage(imageUrl, width, height) {

  var query = qs.stringify({ 
     access_key: '0c472849fca041eaa2395583b36a7521', 
     url: imageUrl, 
     response_type: 'image', 
     format: 'png',
     width: width,
     height: height 
  });
  
  var url = 'https://api.apiflash.com/v1/urltoimage';
  const options = {
     method: 'POST',
     headers: { 'content-type': 'application/x-www-form-urlencoded' },
     responseEncoding: 'binary',
     responseType: 'arraybuffer',
     data: query,
     url
  };

  var response = await axios(options);
  
  return Buffer.from(response.data, 'binary')
}


async function upload(results) {
  
  console.log('Uploading to Applitools');
  const configuration = new Configuration();

  configuration.setApiKey((<HTMLInputElement>document.getElementById('key')).value);
  
  var serverUrl = (<HTMLInputElement>document.getElementById('url')).value
  if (serverUrl) {
    configuration.setServerUrl(serverUrl);
  }

  var setMatchLevel = (<HTMLInputElement>document.getElementById('matchLevel')).value
  configuration.setMatchLevel(eval('MatchLevel.' + setMatchLevel));

  var saveFailedTests = (<HTMLInputElement>document.getElementById('saveFailedTests')).checked;  
  configuration.setSaveFailedTests(saveFailedTests);

  var contrastLevel = (<HTMLInputElement>document.getElementById('contrastLevel')).value
  var aLevel = contrastLevel.split(' ')[0];
  var wcag = contrastLevel.split(' ')[1];
  configuration.setAccessibilityValidation({
    level: eval('AccessibilityLevel.' + aLevel), 
    guidelinesVersion: eval('AccessibilityGuidelinesVersion.WCAG_' + wcag)
  });

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
          
        if (design.name.includes('.com')) {
          var integrationUrl = `https://www.${design.name}`
          console.log("Getting Integration Image");
          await eyes.open(projectName, testName, { width: design.width, height: design.height });
          var img = await getApiflashImage(integrationUrl, design.width, design.height)
          await eyes.check(integrationUrl, Target.image(img).matchLevel(MatchLevel.None))
          await eyes.close(false)
          console.log("Finished Getting Integration Image");
        }

      } catch (error) {
          console.log(error); //Doesn't report an error...
          await eyes.abortIfNotClosed();
      }
      
      return testResults;
  
    })
  )
}
