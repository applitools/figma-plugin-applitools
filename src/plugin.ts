import { debug } from "console"

const { children } = figma.currentPage
const projectName = figma.root.name
//let results = { project: projectName, designs: []}

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'SAVE':
      figma.notify("Getting Designs")
      
      getDesigns(msg.everything)
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
      figma.notify("Please enter your Applitools Server Url and Api Key!")
      break
  }
}

async function collectDesigns(node, results) {
  const exportSettings: ExportSettingsImage = { format: "PNG", suffix: '', constraint: { type: "SCALE", value: 1 }, contentsOnly: false }
  const { id, name, width, height} = node
  const bytes = await node.exportAsync(exportSettings)
  results.designs.push({
    id,
    name,
    width,
    height,
    bytes,
  })
}

async function getDesigns(everything=false) {
  let results = { project: projectName, designs: []}
  for (let node of children) {

    if(everything) {
      await collectDesigns(node, results)
    } else {
      if (node.type === "FRAME") {
        await collectDesigns(node, results)
      }
    }
  }

  figma.notify("Uploading Designs to Applitools")
  figma.ui.postMessage({ results })
}

switch(figma.command) {
  case "settings":
    figma.showUI(__html__);
    figma.ui.resize(500,500);

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
