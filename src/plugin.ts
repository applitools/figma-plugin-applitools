import { ok } from "assert";
import { debug } from "console"

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

const { children, selection } = figma.currentPage
//const selected = figma.currentPage.selection

const projectName = figma.root.name
//let results = { project: projectName, designs: []}

figma.ui.onmessage = async (msg: { 
  type: string; 
  applitoolsApiKey?: string;
  serverUrl?: string;
  everything?: boolean;
  arrWidths?: number[];
}) => {
  switch (msg.type) {
    case 'ADVANCED':
    case 'SAVE':
      figma.notify("Getting Designs")
      if (msg.applitoolsApiKey && msg.serverUrl) {
        await figma.clientStorage.setAsync('applitoolsApiKey', msg.applitoolsApiKey);
        await figma.clientStorage.setAsync('serverUrl', msg.serverUrl);
      }
      // View messenger data
      // for (const key in msg) {
      //   if (msg.hasOwnProperty(key)) {
      //     console.log(msg[key]);
      //   }
      // }

      getDesigns(msg.everything || false, msg.arrWidths || [])
      break
    case 'CANCEL':
      figma.closePlugin()
      break
    case 'UPLOAD_COMPLETE':
      // fix this... seems to cut things off before the upload is actually done
      //figma.closePlugin("Upload Complete!")
      figma.notify("Upload Complete");
      console.log("Upload Complete");
      break
    case 'KEY_OR_URL_ERROR':
      figma.notify("Error: Please enter your Applitools Server Url and Api Key!");
      break
  }
}

async function collectDesigns(
  node: SceneNode,
  results: Results,
  dupResults: Results,
  everything: boolean,
  arrWidths: number[]
) {
  //let parentName = node.parent.name;
  const { id, name, width, height } = node

  const found = results.designs.some((el: DesignResult) => 
    el.name === name && el.width === width && el.height === height
  );

  if (found) {
    dupResults.designs.push({
      id,
      name,
      width,
      height
    });
  } else {
    let viewportArr: {width: number, height: number}[] = [{width, height}];
    if (arrWidths && arrWidths.length > 0) {
      for (const extraWidth of arrWidths) {
        console.log('extra width ' + extraWidth + ' width ' + width + ' height: ' + height)

        let calculatedHeight = Math.round(extraWidth * (height/width));
        viewportArr.push({width: extraWidth, height: calculatedHeight});
        console.log('test name: ' + name + ' calclulated viewport - width: ' + extraWidth + ' height: ' + calculatedHeight)
      }
    }
    for(const viewport of viewportArr) {
      const exportSettings: ExportSettingsImage = { 
        format: "PNG", 
        suffix: '', 
        constraint: { type: "WIDTH", value: viewport.width }, 
        contentsOnly: false 
      }
      // const exportSettings: ExportSettingsImage = { format: "PNG", suffix: '', constraint: { type: "SCALE", value: 1 }, contentsOnly: false } //contentsOnly: everything ??
      

      const bytes = await node.exportAsync(exportSettings)
      results.designs.push({
        id,
        name,
        width: viewport.width,
        height: viewport.height,
        bytes
      })
    }
  }
}

async function getDesigns(everything: boolean = false, arrWidths: number[] = []) {
  let results: Results = { project: projectName, designs: [] }
  let dupResults: Results = { project: projectName, designs: [] }
  
  const nodes = selection.length > 0 ? selection : children;

  for (let node of nodes) {
    if(everything) {
      await collectDesigns(node, results, dupResults, everything, arrWidths)
    } else {
      if (node.type === "FRAME") {
        await collectDesigns(node, results, dupResults, everything, arrWidths)
      }
    }
  }

  figma.notify("Uploading Designs to Applitools")
  figma.ui.postMessage({ results, dupResults })
}

async function sendServerUrlToUI() {
  const serverUrl = await figma.clientStorage.getAsync('serverUrl');
  //console.log('Storage serverUrl: ' + serverUrl)
  figma.ui.postMessage({ serverUrl });
}

switch(figma.command) {
  case "settings":
    figma.showUI(__html__);
    figma.ui.resize(500,500);
    (async () => {
      try {
        let applitoolsApiKey = await figma.clientStorage.getAsync('applitoolsApiKey')
        figma.ui.postMessage({applitoolsApiKey});
        await sendServerUrlToUI();
      } catch (e) {
        console.error('Failed to load configuration:', e);
      }
    })();

    figma.ui.postMessage({ type: 'networkRequest' })
    break;
  case "validate":
    //console.log("validate");
    //test();
    break;
}
