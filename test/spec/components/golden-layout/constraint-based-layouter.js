'use strict';

class GLComponent {
  get layoutManager() {
    return {
      createContentItem: function(config, parent) {
        return new GLComponent(config, parent);
      }
    };
  }

  get isRow() {
    return this.config.type == 'row';
  }

  get isColumn() {
    return this.config.type == 'column';
  }

  get isStack() {
    return this.config.type == 'stack';
  }

  get isComponent() {
    return !this.isRow && !this.isColumn && !this.isStack;
  }
  get element() {
    return [
      {
        offsetWidth: this.config.width,
        offsetHeight: this.config.height
      }
    ];
  }

  constructor(config, parent) {
    this.contentItems = [];
    const { type, height, width, pwidth, pheight } = { ...config };
    this.config = {
      type,
      height: height | pheight,
      width: width || pwidth,
      pwidth,
      pheight
    };
    this.parent = parent;

    this.addChild = jasmine.createSpy().and.callFake(child => {
      this.contentItems.push(new GLComponent(child, this));
    });

    this.replaceChild = jasmine
      .createSpy()
      .and.callFake((oldChild, newChild) => {
        newChild.parent = this;
        this.contentItems = this.contentItems.map(
          item => (oldChild == item ? newChild : item)
        );
      });

    this._$init = jasmine.createSpy();
    this.callDownwards = jasmine.createSpy();
  }

  toJson() {
    return {
      config: this.config,
      contentItems: this.contentItems.map(c => c.toJson())
    };
  }
}

describe('Service: constraint-based-layouter', function() {
  beforeEach(() => module('goldenLayoutModule'));

  beforeEach(
    module($provide => {
      let mockLayout = {
        root: new GLComponent({
          width: 900,
          height: 800,
          type: 'row'
        })
      };
      mockLayout.root.addChild({
        pwidth: 600,
        pheight: 400
      });
      $provide.value('mockLayout', mockLayout);
    })
  );

  it(
    'adding a mostly vertical component is done in a row layout',
    inject((constraintBasedLayouter, mockLayout) => {
      let mockToolConfig = {
        pwidth: 900,
        pheight: 300
      };
      constraintBasedLayouter.addComponent(mockLayout, mockToolConfig);
      expect(mockLayout.root.contentItems[0].config.type).toBe('column');
    })
  );

  it(
    'adding a mostly horizontal component is done in a column layout',
    inject((constraintBasedLayouter, mockLayout) => {
      let mockToolConfig = {
        pwidth: 300,
        pheight: 900
      };
      constraintBasedLayouter.addComponent(mockLayout, mockToolConfig);
      expect(mockLayout.root.contentItems[0].config.type).toBe('row');
    })
  );

  it(
    'adding an sizeless component throws a meaningful exception',
    inject((constraintBasedLayouter, mockLayout) => {
      let mockToolConfig = {
        id: 'MyComponent',
        pwidth: 300
      };
      expect(() =>
        constraintBasedLayouter.addComponent(mockLayout, mockToolConfig)
      ).toThrow(
        'The component MyComponent is missing some required properties: pheight'
      );
    })
  );
});
