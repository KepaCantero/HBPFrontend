'use strict';

describe('Service: tip-service', function() {
  beforeEach(module('tipTooltipModule'));

  var tipTooltipService, TIP_CODES;

  beforeEach(
    inject(function(_tipTooltipService_, _TIP_CODES_) {
      tipTooltipService = _tipTooltipService_;
      TIP_CODES = _TIP_CODES_;
    })
  );

  it('should be visible by default ', function() {
    expect(tipTooltipService.hidden).toBe(true);
  });

  it('should toggle its visibility', function() {
    tipTooltipService.toggleTip();
    expect(tipTooltipService.hidden).toBe(false);
    tipTooltipService.toggleTip();
    expect(tipTooltipService.hidden).toBe(true);
  });

  it('should set current tip', function() {
    tipTooltipService.setCurrentTip(TIP_CODES.WELCOME);
    expect(tipTooltipService.visibleTips[0]).toBe(TIP_CODES.WELCOME);
  });

  it('should reset tip list position when set current tip', function() {
    tipTooltipService.setCurrentTip(TIP_CODES.WELCOME);
    expect(TIP_CODES.WELCOME.tipListPos).toBe(0);
  });

  it('should handle first visible', function() {
    tipTooltipService.hidden = false;

    TIP_CODES.WELCOME.hidden = true;
    expect(tipTooltipService.firstVisible(TIP_CODES.WELCOME)).toBe(false);
    TIP_CODES.WELCOME.hidden = false;

    tipTooltipService.setCurrentTip(TIP_CODES.WELCOME);
    tipTooltipService.setCurrentTip(TIP_CODES.NAVIGATION);

    expect(tipTooltipService.firstVisible(TIP_CODES.WELCOME)).toBe(false);
    expect(tipTooltipService.firstVisible(TIP_CODES.NAVIGATION)).toBe(true);
  });

  it('should not stack duplicate', function() {
    tipTooltipService.visibleTips = [TIP_CODES.WELCOME, TIP_CODES.NAVIGATION];

    TIP_CODES.WELCOME.displayed = false;
    TIP_CODES.NAVIGATION.displayed = false;
    tipTooltipService.setCurrentTip(TIP_CODES.WELCOME);
    tipTooltipService.setCurrentTip(TIP_CODES.NAVIGATION);
    tipTooltipService.setCurrentTip(TIP_CODES.NAVIGATION);

    expect(tipTooltipService.visibleTips.length).toBe(2);
  });

  it('should hide a tip', function() {
    tipTooltipService.hideTip(TIP_CODES.WELCOME);
    expect(TIP_CODES.WELCOME.hidden).toBe(true);
  });

  it('should support someTipsAreHidden', function() {
    tipTooltipService.hidden = false;
    tipTooltipService.setCurrentTip(TIP_CODES.WELCOME);
    tipTooltipService.setCurrentTip(TIP_CODES.NAVIGATION);
    tipTooltipService.hideTip(TIP_CODES.NAVIGATION);

    expect(tipTooltipService.someTipsAreHidden()).toBe(true);
  });

  it('should move to previous/next tips', function() {
    TIP_CODES.SIMULATIONS_TIPS.tipListPos = null;
    tipTooltipService.setCurrentTip(TIP_CODES.SIMULATIONS_TIPS);
    tipTooltipService.showNext(TIP_CODES.SIMULATIONS_TIPS);
    expect(TIP_CODES.SIMULATIONS_TIPS.tipListPos).toBe(1);
    tipTooltipService.showPrevious(TIP_CODES.SIMULATIONS_TIPS);
    expect(TIP_CODES.SIMULATIONS_TIPS.tipListPos).toBe(0);
  });
});
