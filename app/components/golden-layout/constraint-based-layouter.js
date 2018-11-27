/**
 * Layout mechanism that uses components' prefered sizes {pwidth & pheight}
 * to come up with the relative best location to add the new components
 */
class ConstraintBasedLayouter {
  /**
   * Generates the list of all the possible locations where a new components can be placed
   *
   * @private
   * @param {GL_Component} container A golden layout container
   * @returns {*GL_Component} The list of possible insert locations
   */
  *getPossibleInsertLocations(container) {
    if (container.isComponent) yield container;

    for (let item of container.contentItems)
      yield* this.getPossibleInsertLocations(item);
  }

  /**
   * Places a new component at the required location, orientation
   * and with the specified percentage in the conxcerned orientation
   *
   * @private
   * @param {GL_Component_config} component Component config for the new component
   * @param {GL_Component} location The component
   * @param {boolean} horizontal Whether the orientation is horizontal or not (not=>vertical)
   * @param {float \in [0, 100]} percentage Percentage of space in the concerned orienattion to give to the new component
   */
  placeComponent(component, location, horizontal, percentage) {
    let parent = location.parent;
    let child = location;
    while (parent.isStack) {
      child = parent;
      parent = parent.parent;
    }

    // For some reason, new components have to be within a new stack
    // inspired by GL source-code
    let stack = parent.layoutManager.createContentItem(
      {
        type: 'stack'
      },
      parent
    );
    stack._$init();
    stack.addChild(component);

    let insertBefore = false;
    let type = !horizontal ? 'column' : 'row';
    let dimension = !horizontal ? 'height' : 'width';

    let rowOrColumn = parent.layoutManager.createContentItem({ type }, parent);
    parent.replaceChild(child, rowOrColumn);

    rowOrColumn.addChild(stack, insertBefore ? 0 : undefined, true);
    rowOrColumn.addChild(child, insertBefore ? undefined : 0, true);

    parent.config[dimension] = 100 - percentage;
    stack.config[dimension] = percentage;
    rowOrColumn.callDownwards('setSize');
  }

  /**
   * Calculates the fitness of placing a component at a giveb location in a certain orientation
   * Fitness is the delta between the space that can be allocated in the given location as opposed
   * to the prefered component size as specified in the component config (Smaller fitness is better)
   *
   * @private
   * @param {GL_Component} location The location where to place the new component
   * @param {GL_Component_config} component The config for the new component to place
   * @param {boolean} horizontal Whether it is a horizontal placement (or vertical)
   */
  getSolutionFitness(location, component, horizontal) {
    const { offsetHeight, offsetWidth } = location.element[0];
    const { pwidth: width, pheight: height } = component;

    let fitness = 0;
    if (horizontal && height) {
      fitness = Math.abs(offsetHeight - height);
    } else if (!horizontal && width) {
      fitness = Math.abs(offsetWidth - width);
    }

    // Calculate container size in the related orientation
    const dimension = horizontal ? offsetWidth : offsetHeight;

    // Calculate new component prefered size in the related orientation
    const dim1 = horizontal ? width : height;

    // Calculate pre-existing companion component prefered size in the related orientation
    const dim2 = horizontal ? location.config.pwidth : location.config.pheight;

    // Calculate proportial size to allocate to the new component in the concerned dimension
    let size1 = dimension / (dim1 + dim2) * dim1;

    // Calculate proportial size to allocate to the pre-existing companion component in the concerned dimension
    let size2 = dimension - size1;

    fitness += Math.abs(dim1 - size1) + Math.abs(dim2 - size2);

    return {
      fitness,
      //percentage size to allocate to the new component in the concerned dimension
      percentage: size1 * 100 / dimension
    };
  }

  /**
   * Retrieves a component effective sizes and prefered sizes
   *
   * @private
   * @param {*} component
   * @returns The component effective sizes and prefered sizes
   */
  _getChildSizeSize(component) {
    const {
      offsetHeight: effectiveHeight,
      offsetWidth: effectiveWidth
    } = component.element[0];

    const { pwidth: width, pheight: height } = component.config;

    return {
      effectiveHeight,
      height,
      effectiveWidth,
      width
    };
  }

  /**
   * Re-equilibrates the space allocated between components in the existing layout,
   * recusrively and bottom up to approximate prefered sizes as much as possible.
   *
   * @private
   * @param {GL_Component} container The container to re-equilibrate
   * @returns The container effective sizes and prefered sizes
   */
  reequilibrate(container) {
    if (container.isComponent) return this._getChildSizeSize(container);

    let childSizes = container.contentItems.map(item =>
      this.reequilibrate(item)
    );

    // A single chilld, nothing to re-equilibrate here
    if (childSizes.length == 1 || (!container.isRow && !container.isColumn))
      return childSizes[0];

    const horizontal = container.isRow;

    const [dimensionProp, otherDimension] = horizontal
      ? ['width', 'height']
      : ['height', 'width'];

    // Sum of prefered size in the concerned container dimension (row=>width, column=>height)
    const sumDim = childSizes.reduce(
      (sum, item) => sum + item[dimensionProp],
      0
    );

    const {
      offsetHeight: effectiveHeight,
      offsetWidth: effectiveWidth
    } = container.element[0];

    // How much prefered sizes should be scaled in the concerned dimension
    const scaleRatio = 100 / sumDim;

    // New components' sizes in percentage, in the concerned dimension
    const newRelativeSizes = childSizes.map(
      item => item[dimensionProp] * scaleRatio
    );

    // The prefered size in the non-concerned dimension, to the used by parents
    const otherDimensionWished =
      childSizes.reduce(
        (sum, item) => sum + item[otherDimension] * item[dimensionProp],
        0
      ) / sumDim;

    // Applies new calculated relative sizes
    for (let i = 0; i < container.contentItems.length; i++)
      container.contentItems[i].config[dimensionProp] = newRelativeSizes[i];

    // Apply the new sizes
    container.callDownwards('setSize');

    return {
      effectiveHeight,
      effectiveWidth,
      height: horizontal ? otherDimensionWished : sumDim,
      width: horizontal ? sumDim : otherDimensionWished
    };
  }

  /**
   * Checks if the component config is valid
   * Throws an exception if it is not the case
   *
   * @private
   * @param {GL_Component_config} component A Gl component config
   */
  verifyComponentRequirements(component) {
    const requiredProperties = ['pwidth', 'pheight'];
    const missingProperties = requiredProperties.filter(p => !component[p]);
    if (missingProperties.length)
      throw `The component ${component.id} is missing some required properties: ${missingProperties.join(
        ', '
      )}`;
  }

  /**
   * Layouter public method to be called by GL service when adding a new component
   *
   * @public
   * @param {GL_Component} layout
   * @param {GL_Component_config} component
   * @memberof ConstraintBasedLayouter
   */
  addComponent(layout, component) {
    this.verifyComponentRequirements(component);

    const container = layout.root;
    // Calculates the solution with the best fitness
    let bestSolution = [...this.getPossibleInsertLocations(container)]
      .map(location => [true, false].map(horizontal => [location, horizontal]))
      .flat()
      .map(([location, horizontal]) => {
        const { fitness, percentage } = this.getSolutionFitness(
          location,
          component,
          horizontal
        );
        return {
          fitness,
          percentage,
          location,
          horizontal
        };
      })
      .reduce(
        (best, solution) =>
          best && best.fitness < solution.fitness ? best : solution,
        null
      );

    if (!bestSolution)
      throw 'Could not find a solution for placing element in layout';

    // Places the component at the best found solution
    let { location, horizontal, percentage } = bestSolution;
    this.placeComponent(component, location, horizontal, percentage);

    // Re-equilibrates layout globally
    this.reequilibrate(layout.root);
  }
}

angular
  .module('goldenLayoutModule')
  .service('constraintBasedLayouter', ConstraintBasedLayouter);
