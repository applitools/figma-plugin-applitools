const { children } = figma.currentPage

figma.ui.onmessage = async ( msg) => {
  switch (msg.type) {
    case 'SAVE':
      figma.notify("Getting Designs")
      getDesigns()
      break
    case 'CANCEL':
      figma.closePlugin()
      break
    case 'UPLOAD_COMPLETE':
      // fix this... seems to cut things off before the upload is actually done
      //figma.closePlugin("Upload Complete!")
      break
    case 'KEY_OR_URL_ERROR':
      figma.notify("Please enter your Applitools Server Url and Api Key!")
      break
  }
}

async function getDesigns() {
  let results = { designs: []}
  const exportSettings: ExportSettingsImage = { format: "PNG", suffix: '', constraint: { type: "SCALE", value: 1 }, contentsOnly: true }
  
  // might need to filter out certain types
  for (let node of children) {
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
  figma.notify("Uploading Designs to Applitools")
  figma.ui.postMessage({ results })
}

switch(figma.command) {
  case "settings":
    figma.showUI(__html__);
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
