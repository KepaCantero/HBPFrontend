/**
 * Historical layouter
 * Places all elements in a row at the root level
 * With widths equally distributed
 */
class AddAsColumnLayouter {
  addComponent(layout, component) {
    const container = layout.root;
    if (
      container.contentItems.length === 1 &&
      container.contentItems[0].isStack
    ) {
      let newContent = [];
      if (container.contentItems[0].contentItems) {
        container.contentItems[0].contentItems.forEach(content => {
          newContent.push(content.config);
        });
      }
      newContent.push(component);

      container.removeChild(container.contentItems[0]);
      container.addChild({
        type: 'row',
        content: newContent
      });
    } else {
      container.contentItems[0].addChild(component);
    }
  }
}

angular
  .module('goldenLayoutModule')
  .service('addAsColumnLayouter', AddAsColumnLayouter);
