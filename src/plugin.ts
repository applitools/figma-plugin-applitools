import { ok } from "assert";
import { debug } from "console"

const { children, selection } = figma.currentPage
//const selected = figma.currentPage.selection

const projectName = figma.root.name
//let results = { project: projectName, designs: []}

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'ADVANCED':
    case 'SAVE':
      figma.notify("Getting Designs")
      figma.clientStorage.setAsync('applitoolsApiKey', msg.applitoolsApiKey)
      getDesigns(msg.everything, msg.arrWidths)
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
      figma.notify("Please enter your Applitools Server Url and Api Key!", {
        error: true,
        button: {
          text: 'OK',
          action: () => true
        }
      })
      break
  }
}

async function collectDesigns(node, results, dupResults, everything, arrWidths) {
  //let parentName = node.parent.name;
  const { id, name, width, height } = node

  const found = results.designs.some(el => el.name === name && el.width=== width && el.height === height);

  if (found) {
    dupResults.designs.push({
      id,
      name,
      width,
      height
    })  } else {

    let viewportArr: {width: number, height: number}[] = [{width:width, height:height}];
    if (arrWidths && arrWidths.length > 0) {
      for (const extraWidth of arrWidths) {
        console.log('extra width ' + extraWidth + ' width ' + width + ' height: ' + height)

        let calculatedHeight = Math.round(extraWidth * (height/width));
        viewportArr.push({width:extraWidth, height: calculatedHeight});
        console.log('test name: ' + name + ' calclulated viewport - width: ' + extraWidth + ' height: ' + calculatedHeight)
      }
    }
    for(const viewport of viewportArr) {
      const exportSettings: ExportSettingsImage = { format: "PNG", suffix: '', constraint: { type: "WIDTH", value: viewport.width }, contentsOnly: false } //contentsOnly: everything ??
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

async function getDesigns(everything=false, arrWidths) {
  let results = { project: projectName, designs: []}
  let dupResults = { project: projectName, designs: []}
  
  if (selection.length > 0) {
    //https://www.figma.com/plugin-docs/api/properties/PageNode-selection/
    var nodes = selection;
  } else {
    var nodes = children;
  }

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

switch(figma.command) {
  case "settings":
    figma.showUI(__html__);
    figma.ui.resize(500,500);
    (async () => {
      try {
        let applitoolsApiKey = await figma.clientStorage.getAsync('applitoolsApiKey')
        figma.ui.postMessage({applitoolsApiKey});
      } catch (e) {
          // Deal with the fact the chain failed
      }
    })();

   // console.log("settings");
    // This shows the HTML page in "ui.html".
    //figma.showUI(__html__);
    figma.ui.postMessage({ type: 'networkRequest' })
    break;
  case "validate":
    //console.log("validate");
    //test();
    break;
}
