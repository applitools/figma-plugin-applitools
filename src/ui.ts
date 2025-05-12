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

const VERSION = '1.0';

// Type definitions
interface DesignResult {
  id: string;
  name: string;
  width: number;
  height: number;
  bytes?: Uint8Array;
}

interface Results {
  project: string;
  designs: DesignResult[];
}

interface Message {
  type?: string;
  applitoolsApiKey?: string;
  serverUrl?: string;
  results?: Results;
  dupResults?: Results;
}

// Helper function to safely get elements
function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element with id ${id} not found`);
  }
  return element as T;
}

// Initialize UI elements
const saveButton = getElement<HTMLButtonElement>('save');
const cancelButton = getElement<HTMLButtonElement>('cancel');
const keyInput = getElement<HTMLInputElement>('key');
const urlInput = getElement<HTMLInputElement>('url');
const everythingCheckbox = getElement<HTMLInputElement>('everything');
const widthsInput = getElement<HTMLInputElement>('widths');
const resultsSection = getElement<HTMLDivElement>('results-section');
const baselineListSection = getElement<HTMLDivElement>('baseline-list-section');
const resultsUrl = getElement<HTMLAnchorElement>('results-url');
const baselineList = getElement<HTMLUListElement>('baseline-list');

saveButton.onclick = (event) => {
  getElement<HTMLDivElement>('console').style.display = 'inherit';
  window.scrollBy(0, 500);
  
  const apiKey = keyInput.value;
  const url = urlInput.value;

  resultsUrl.style.display = 'none';
  resultsUrl.href = '';
  resultsUrl.textContent = '';

  resultsSection.style.display = 'none';
  baselineListSection.style.display = 'none';

  if (apiKey.length > 0) {
    saveButton.style.backgroundColor = "#5A5A5A";
    saveButton.style.cursor = "not-allowed";
    saveButton.onclick = null;
    saveButton.setAttribute('disabled', 'disabled');

    const allComponents = everythingCheckbox.checked;
    const widths = widthsInput.value;
    const arrWidths = parseWidths(widths);
    parent.postMessage({ 
      pluginMessage: { 
        type: 'SAVE', 
        everything: allComponents, 
        applitoolsApiKey: apiKey, 
        serverUrl: url, 
        arrWidths: arrWidths 
      } 
    }, '*');
  } else {
    parent.postMessage({ pluginMessage: { type: 'KEY_OR_URL_ERROR' } }, '*');
  }
}

cancelButton.onclick = () => {
  console.log("User Cancelled");
  parent.postMessage({ pluginMessage: { type: 'CANCEL' } }, '*');
}

let batchUrls: string[] = [];
let results: { [key: string]: any } = {};
let statusCounter: { [key: string]: number } = {};

onmessage = async (event: MessageEvent) => {
  const message: Message = event.data.pluginMessage;
  
  if (message.applitoolsApiKey) {
    keyInput.value = message.applitoolsApiKey;
  }

  if (message.dupResults?.designs.length) {
    console.log("duplicates found: " + message.dupResults.designs.length);
    console.log("Frame names must be unique for each resolution/viewport.");
    for (const result of message.dupResults.designs) {
      console.log(`Skipping duplicate frame: ${result.name}, width ${result.width}, height ${result.height}`);
    }
  }

  if (message.results) {
    console.log("Designs Collected");
    const baselineList: string[] = [];
    const projectName = message.results.project;

    try {
      const tresults = await upload(message.results, baselineList, projectName);
      const isError = tresults.some(test => test instanceof Error);

      if (isError) {
        console.log('Error uploading to Applitools');
      } else {
        batchUrls = tresults.map(test => test._appUrls._batch)
          .filter((item, i, ar) => ar.indexOf(item) === i);

        results = {};
        statusCounter = {};

        tresults.forEach((test, index) => {
          results[`${index}`] = {
            appName: test._appName,
            testName: test._name,
            viewportSize: test._hostDisplaySize.toString(),
            hostApp: test._hostApp,
            hostOS: test._hostOS,
            status: test._status,
          };
        });

        tresults.map(test => test._status).forEach(function(obj) {
          const key = JSON.stringify(obj);
          statusCounter[key] = (statusCounter[key] || 0) + 1;
        });
        
        const cleanedStatusCounter = Object.fromEntries(
          Object.entries(statusCounter).map(([key, value]) => [key.replace(/["\\]/g, ''), value])
        );

        const detailedResult = Object.entries(results).map(([index, details]) => {
          const detailsString = Object.entries(details)
            .map(([key, value]) => `${key}: '${value}'`)
            .join('\n');
          return `${parseInt(index) + 1}. \n${detailsString}\n`;
        }).join('\n');

        console.log(`\nBatch Url: ${batchUrls.join('')}\n`);
        console.log(`Test Results Summary: ${JSON.stringify(cleanedStatusCounter)}\n`);
        console.log(`Detailed Test Results:\n${detailedResult}`);

        const openDashboard = getElement<HTMLAnchorElement>('opendashboard');
        openDashboard.setAttribute('onclick', `window.open('${batchUrls.join('')}','_blank')`);

        const baselineListElement = getElement<HTMLUListElement>('baseline-list');
        baselineList.forEach(function(obj) {
          const li = document.createElement('li');
          li.innerHTML = obj;
          baselineListElement.appendChild(li);
        });

        resultsSection.style.display = 'inherit';
        baselineListSection.style.display = 'inherit';

        parent.postMessage({ pluginMessage: { type: 'UPLOAD_COMPLETE' } }, '*');
        window.scrollBy(0, 500);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      } else {
        console.log('An unknown error occurred');
      }
    }
  }
}

function parseWidths(widths: string): number[] {
  if (widths && widths.length > 0) {
    try {
      return widths.split(',').map(element => {
        const num = Number(element);
        return isNaN(num) ? null : num;
      }).filter((num): num is number => num !== null);
    } catch (error) {
      console.log('Unable to parse widths... skipping exporting extra images');
    }
  }
  return [];
}

async function upload(results: Results, baselineList: string[], projectName: string) {
  console.log('Uploading to Applitools');
  const config = new Configuration();

  config.setApiKey(keyInput.value);
  
  const serverUrl = urlInput.value;
  if (serverUrl) {
    config.setServerUrl(serverUrl);
  }

  const setMatchLevel = getElement<HTMLInputElement>('matchLevel').value;
  if (setMatchLevel) {
    config.setMatchLevel(eval('MatchLevel.' + setMatchLevel));
  }

  const saveFailedTests = getElement<HTMLInputElement>('saveFailedTests').checked;  
  config.setSaveFailedTests(saveFailedTests);

  const contrastLevel = getElement<HTMLInputElement>('contrastLevel').value;
  if (contrastLevel) {
    const [aLevel, wcag] = contrastLevel.split(' ');
    config.setAccessibilityValidation({
      level: eval('AccessibilityLevel.' + aLevel), 
      guidelinesVersion: eval('AccessibilityGuidelinesVersion.WCAG_' + wcag)
    });
  }

  const figmaAgentString = "figma-plugin/" + VERSION;

  console.log(`\nBatch Name: ${projectName}`);
  console.log(`Application Name: ${projectName}\n`);
  
  const batchInfo = new BatchInfo(projectName);
  batchInfo.setNotifyOnCompletion(false);
  
  config.setBatch(batchInfo);
  config.setAgentId(figmaAgentString); 
  config.setIgnoreDisplacements(true);

  return await Promise.all(
    results.designs.map(async (design) => {
      const eyes = new Eyes();
      try {
        eyes.setConfiguration(config);

        const proxyUrl = getElement<HTMLInputElement>('proxy').value;
        if (proxyUrl) {
          console.log("Setting Proxy: " + proxyUrl);
          eyes.setProxy(proxyUrl);
        }

        const testName = design.name;
        const baselineEnvName = `${testName}_${design.width}`;
        eyes.setBaselineEnvName(baselineEnvName);

        const os = getElement<HTMLInputElement>('os').value;
        const browser = getElement<HTMLInputElement>('browser').value;

        eyes.setHostApp(browser);
        eyes.setHostOS(os);

        baselineList.push(`Test Name: ${testName}<br>Baseline Environment Name: ${baselineEnvName}`);
        await eyes.open(projectName, testName, { width: design.width, height: design.height });
        await eyes.check(testName, Target.image(Buffer.from(design.bytes!)));

        return await eyes.close(false);
      } catch (error) {
        if (error instanceof Error) {
          console.log(`\n${error.message}\n`);
        }
        throw error;
      }
    })
  );
}