const {
  MatchLevel,
  AccessibilityLevel,
  AccessibilityGuidelinesVersion,
  Region,
  ImageMatchSettings,
  ExactMatchSettings,
} = require('@applitools/eyes-images')

const VERSION = '1.0';
document.getElementById('advanced').onclick = (event) => {
  event.preventDefault();
  const hideShow = <HTMLSpanElement>document.getElementById('hideShow');
  const advancedSection = <HTMLDivElement>document.getElementById('advanced-section');
  if (hideShow && hideShow.textContent === 'Show') {
    hideShow.textContent = 'Hide'
    advancedSection.style.display='inherit';
  } else {
    hideShow.textContent = 'Show'
    advancedSection.style.display='none';
  }
}

document.getElementById('save').onclick = (event) => {
  let apiKey = (<HTMLInputElement>document.getElementById('key')).value;
  let resultsHref = <HTMLAnchorElement>document.getElementById("results-url");
  resultsHref.style.display='none';
  resultsHref.href='';
  resultsHref.textContent='';

  let baselnieList = <HTMLUListElement>document.getElementById('baseline-list');
  baselnieList.innerHTML = '';

  (<HTMLDivElement>document.getElementById('results-section')).style.display='none';
  (<HTMLDivElement>document.getElementById('baseline-list-section')).style.display='none';

  if (apiKey.length > 0) {
    (<HTMLButtonElement>document.getElementById('save')).disabled=true;
    var allComponents = (<HTMLInputElement>document.getElementById('everything')).checked;
    parent.postMessage({ pluginMessage: { type: 'SAVE', everything: allComponents, applitoolsApiKey: apiKey } }, '*');
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
  if (message.applitoolsApiKey) {
    (<HTMLInputElement>document.getElementById('key')).value = message.applitoolsApiKey
  }
  if (message.dupResults) {
    console.log("duplicates found: " + message.dupResults.designs.length);
    console.log("Frame names must be unique for each resoolution.");
    for (let result of message.dupResults.designs) {
      console.log(`Skipping duplicate frame: ${result.name}, width ${result.width}, height ${result.height}`);
    }
  }
  if (message.results) {
    console.log("Designs Collected");
    const baselineList = [];
    let projectName = `${message.results.project}`

    let baselnieList = <HTMLUListElement>document.getElementById('baseline-list');
    var li = document.createElement('li'); 
    li.innerHTML = 'Application name ' + projectName;
    baselnieList.appendChild(li);

    (async () => {
      let batchUrls;
      let statusCounter = {}
      await upload(message.results, baselineList, projectName).then(function (tresults) {
  
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
        } finally {
          (<HTMLButtonElement>document.getElementById('save')).disabled=false;
        }
        
        console.log(`\nBatch Url: ${batchUrls.join('')}\n`);
        console.log(`Test Results: ${JSON.stringify(statusCounter)}\n`);
        let resultsHref = <HTMLAnchorElement>document.getElementById("results-url");
        resultsHref.href=batchUrls.join('');
        resultsHref.textContent=batchUrls.join('');
        resultsHref.style.display='inherit';

        let baselnieList = <HTMLUListElement>document.getElementById('baseline-list');
        baselineList.forEach(function(obj) {
          var li = document.createElement('li');     // create li element.
          li.innerHTML = obj;      // assigning text to li using array value.
          baselnieList.appendChild(li);
        });


        (<HTMLDivElement>document.getElementById('results-section')).style.display='inherit';
        (<HTMLDivElement>document.getElementById('baseline-list-section')).style.display='inherit';
        //debugger;
        parent.postMessage({ pluginMessage: { type: 'UPLOAD_COMPLETE' } }, '*')
      })
    })();
  }
}

async function upload(results, baselineList, projectName) {
  
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

  let figmaAgentString = "figma-plugin/" + VERSION;
  console.log(`Application Name: ${projectName}`);
  configuration.setBatch(new BatchInfo(projectName));
  configuration.setAgentId(figmaAgentString);
  
  return await Promise.all(
    
    await results.designs.map(async (design) => {
      let testResults;
      let testName = `${design.name}`

      const eyes = new Eyes()
 
      try {
          eyes.setConfiguration(configuration);

          //Set Proxy if entered...
          var proxyUrl = (<HTMLInputElement>document.getElementById('proxy')).value
          if (proxyUrl) {
            console.log("Setting Proxy: " + proxyUrl)
            eyes.setProxy(proxyUrl);
          }

          let baselineEnvName = `${testName}_${design.width}`;
          eyes.setBaselineEnvName(`${baselineEnvName}`);

          const os = (<HTMLInputElement>document.getElementById('os')).value;
          const browser = (<HTMLInputElement>document.getElementById('browser')).value;
          eyes.setHostApp(`${figmaAgentString}`)

          if (browser && browser.length >= 0) {
            eyes.setHostApp(`${browser}`)
          }
          if (os && os.length >= 0) {
            eyes.setHostOS(`${os}`)
          }
          

          baselineList.push(`TestName: ${testName}, Baseline Environment Name: ${baselineEnvName}`);
          await eyes.open(projectName, testName, { width: design.width, height: design.height });
          await eyes.check(testName, Target.image(Buffer.from(design.bytes)));

          testResults = await eyes.close(false);

          //console.log(testResults);
      } catch (error) {
          console.log(error.message); //Doesn't report an error...
          await eyes.abortIfNotClosed();
      }
      
      return testResults;
  
    })
  )
}
