'use strict';

describe('Service: add-as-column-layouter', function() {
  beforeEach(() => module('goldenLayoutModule'));

  let mockLayout;
  beforeEach(() => {
    mockLayout = {
      root: {
        addChild: jasmine.createSpy('addChild'),
        removeChild: jasmine.createSpy('removeChild'),
        contentItems: [
          {
            addChild: jasmine.createSpy('addChild'),
            config: {},
            contentItems: [{}]
          }
        ]
      }
    };
  });

  it(
    'addComponent',
    inject(addAsColumnLayouter => {
      let mockToolConfig = {
        id: 'mock-id',
        componentState: {
          singleton: true
        }
      };

      // not a stack to be added to
      mockLayout.root.contentItems[0].isStack = false;

      addAsColumnLayouter.addComponent(mockLayout, mockToolConfig);
      expect(mockLayout.root.contentItems[0].addChild).toHaveBeenCalledWith(
        mockToolConfig
      );

      // add tool to stack, convert stack to row
      mockLayout.root.contentItems[0].isStack = true;

      addAsColumnLayouter.addComponent(mockLayout, mockToolConfig);
      expect(mockLayout.root.contentItems[0].addChild).toHaveBeenCalledWith(
        mockToolConfig
      );
    })
  );
});
