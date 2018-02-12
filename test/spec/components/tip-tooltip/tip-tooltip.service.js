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
    expect(tipTooltipService.currentTip).toBe(TIP_CODES.WELCOME);
  });

  it('should reset tip list position when set current tip', function() {
    tipTooltipService.tipListPos = 1;
    tipTooltipService.setCurrentTip(TIP_CODES.WELCOME);
    expect(tipTooltipService.tipListPos).toBe(0);
  });

  it('should move to previous/next tips', function() {
    tipTooltipService.setCurrentTip(TIP_CODES.SIMULATIONS_TIPS);
    tipTooltipService.showNext();
    expect(tipTooltipService.tipListPos).toBe(1);
    tipTooltipService.showPrevious();
    expect(tipTooltipService.tipListPos).toBe(0);
  });
});
