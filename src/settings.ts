figma.showUI(__html__);

const frameNode = figma.currentPage.selection[0] as FrameNode;

const type = figma.command === 'regenerate' ? frameNode.getPluginData('type') : figma.command;
console.log("command " + type);
