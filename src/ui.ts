'use strict'

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

const VERSION = '1.2.0';

document.getElementById('save').onclick = (event) => {

  (<HTMLDivElement>document.getElementById('console')).style.display = 'inherit';
  window.scrollBy(0, 500);

  let apiKey = (<HTMLInputElement>document.getElementById('key')).value;
  let url = (<HTMLInputElement>document.getElementById('url')).value

  let resultsHref = <HTMLAnchorElement>document.getElementById("results-url");
  resultsHref.style.display = 'none';
  resultsHref.href = '';
  resultsHref.textContent = '';

  (<HTMLDivElement>document.getElementById('results-section')).style.display = 'none';
  (<HTMLDivElement>document.getElementById('baseline-list-section')).style.display = 'none';

  if (apiKey.length > 0) {
    document.getElementById('save').style.backgroundColor = "#5A5A5A";
    document.getElementById('save').style[ 'cursor' ] = "not-allowed";
    document.getElementById('save').onclick = null;
    document.getElementById('save').attributes[ 'onclick' ] = null;
    document.getElementById('save').attributes[ 'disabled' ] = 'disabled';

    var allComponents = (<HTMLInputElement>document.getElementById('everything')).checked;
    const widths = (<HTMLInputElement>document.getElementById('widths')).value;
    const arrWidths = parseWidths(widths)
    parent.postMessage({ pluginMessage: { type: 'SAVE', everything: allComponents, applitoolsApiKey: apiKey, serverUrl: url, arrWidths: arrWidths } }, '*');
  }
  else {
    parent.postMessage({ pluginMessage: { type: 'KEY_OR_URL_ERROR' } }, '*')
  }
}

document.getElementById('cancel').onclick = () => {
  console.log("User Cancelled")
  parent.postMessage({ pluginMessage: { type: 'CANCEL' } }, '*')
}

let batchUrls: any[] = [];
let results: { [ key: string ]: any } = {};
let statusCounter: { [ key: string ]: number } = {};

onmessage = async event => {
  let message = event.data.pluginMessage;
  if (message.applitoolsApiKey) {
    (<HTMLInputElement>document.getElementById('key')).value = message.applitoolsApiKey
  }

  if (message.dupResults && message.dupResults.designs.length) {
    console.log("duplicates found: " + message.dupResults.designs.length);
    console.log("Frame names must be unique for each resolution/viewport.");
    for (let result of message.dupResults.designs) {
      console.log(`Skipping duplicate frame: ${result.name}, width ${result.width}, height ${result.height}`);
    }
  }
  if (message.results) {
    console.log("Designs Collected");
    const baselineList = [];
    let projectName = `${message.results.project}`

    try {
      const tresults = await upload(message.results, baselineList, projectName);
      let isError = tresults.some(test => test instanceof Error);

      if (isError) {
        console.log('Error uploading to Applitools');
      } else {

        batchUrls = tresults.map(test => test._appUrls._batch).filter((item, i, ar) => ar.indexOf(item) === i)

        results = {};
        statusCounter = {};

        tresults.forEach((test, index) => {
          results[ `${index}` ] = {
            appName: test._appName,
            testName: test._name,
            viewportSize: test._hostDisplaySize.toString(),
            hostApp: test._hostApp,
            hostOS: test._hostOS,
            status: test._status,
          };
        });

        tresults.map(test => test._status).forEach(function (obj) {
          var key = JSON.stringify(obj)
          statusCounter[ key ] = (statusCounter[ key ] || 0) + 1
        })

        const cleanedStatusCounter = Object.fromEntries(
          Object.entries(statusCounter).map(([ key, value ]) => [ key.replace(/["\\]/g, ''), value ])
        );

        const detailedResult = Object.entries(results).map(([ index, details ]) => {
          const detailsString = Object.entries(details)
            .map(([ key, value ]) => `${key}: '${value}'`)
            .join('\n');
          return `${parseInt(index) + 1}. \n${detailsString}\n`; // Add the index (1-based)
        }).join('\n');

        console.log(`\nBatch Url: ${batchUrls.join('')}\n`);
        console.log(`Test Results Summary: ${JSON.stringify(cleanedStatusCounter)}\n`);
        console.log(`Detailed Test Results:\n${detailedResult}`);

        let resultsHref = document.getElementById("opendashboard");
        resultsHref.setAttribute('onclick', "window.open('" + batchUrls.join('') + "','_blank')");

        let baseList = <HTMLUListElement>document.getElementById('baseline-list');
        baselineList.forEach(function (obj) {
          var li = document.createElement('li');     // create li element.
          li.innerHTML = obj;      // assigning text to li using array value.
          baseList.appendChild(li);
        });

        (<HTMLDivElement>document.getElementById('results-section')).style.display = 'inherit';
        (<HTMLDivElement>document.getElementById('baseline-list-section')).style.display = 'inherit';

        parent.postMessage({ pluginMessage: { type: 'UPLOAD_COMPLETE' } }, '*')

        window.scrollBy(0, 500);
      }
    } catch (error) {
      console.log(error);
    } finally {
      // (<HTMLButtonElement>document.getElementById('save')).disabled = false;
      // document.getElementById('save').removeAttribute('disabled');
      //(<HTMLButtonElement>document.getElementById('save')).removeAttribute('disabled')
      //(<HTMLDivElement>document.getElementById('save')).removeAttribute('disabled');
    }
  }
}

function parseWidths(widths) {
  if (widths && widths.length > 0) {
    try {
      return widths.split(',').map(element => {
        if (isNaN(element)) {
          return null;
        } else {
          return Number(element);
        }
      });
    } catch (error) {
      console.log('Unable to parse widths... skipping exporting extra images');
    }
  }
  return [];
}

async function upload(results, baselineList, projectName) {
  console.log('Uploading to Applitools');
  const config = new Configuration();

  config.setApiKey((<HTMLInputElement>document.getElementById('key')).value);

  var serverUrl = (<HTMLInputElement>document.getElementById('url')).value
  if (serverUrl) {
    config.setServerUrl(serverUrl);
  }

  var setMatchLevel = (<HTMLInputElement>document.getElementById('matchLevel')).value
  if (setMatchLevel === null || setMatchLevel === "") { }
  else
    config.setMatchLevel(eval('MatchLevel.' + setMatchLevel));

  var saveFailedTests = (<HTMLInputElement>document.getElementById('saveFailedTests')).checked;
  config.setSaveFailedTests(saveFailedTests);

  var setIgnoreDisplacements = (<HTMLInputElement>document.getElementById('ignoreDisplacements')).checked;
  config.setIgnoreDisplacements(setIgnoreDisplacements);

  var contrastLevel = (<HTMLInputElement>document.getElementById('contrastLevel')).value

  if (contrastLevel === null || contrastLevel === "") { }
  else {
    var aLevel = contrastLevel.split(' ')[ 0 ];
    var wcag = contrastLevel.split(' ')[ 1 ];
    config.setAccessibilityValidation({
      level: eval('AccessibilityLevel.' + aLevel),
      guidelinesVersion: eval('AccessibilityGuidelinesVersion.WCAG_' + wcag)
    });
  }

  let figmaAgentString = "figma-plugin/" + VERSION;

  console.log(`\nBatch Name: ${projectName}`);
  console.log(`Application Name: ${projectName}\n`);

  const batchInfo = new BatchInfo(projectName);

  var shouldSetNotifyOnCompletion = (<HTMLInputElement>document.getElementById('setNotifyOnCompletion')).checked;
  batchInfo.setNotifyOnCompletion(shouldSetNotifyOnCompletion);

  config.setBatch(batchInfo);
  config.setAgentId(figmaAgentString);

  return await Promise.all(

    await results.designs.map(async (design) => {
      let testResults;
      let testName = `${design.name}`

      const eyes = new Eyes()

      try {
        eyes.setConfiguration(config);

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

        eyes.setHostApp(browser)
        eyes.setHostOS(os)

        baselineList.push(`Test Name: ${testName}<br>Baseline Environment Name: ${baselineEnvName}`);
        await eyes.open(projectName, testName, { width: design.width, height: design.height });
        await eyes.check(testName, Target.image(Buffer.from(design.bytes)));

        testResults = await eyes.close(false);

      } catch (error) {
        console.log(`\n${error.message}\n`);
        await eyes.abortIfNotClosed();
        testResults = error;
      }

      return testResults;

    })
  )
}