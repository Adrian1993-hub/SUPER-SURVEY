using SuperSurvey.Calculations.DraftSurvey;
using Xunit;

namespace SuperSurvey.Calculations.Tests;

/// <summary>
/// Regression tests anchored to a real draft-survey worksheet (vessel and job anonymized).
///
/// Inputs use the worksheet's drafts-at-perpendicular and interpolated hydrostatic values, which are
/// displayed rounded to 3 dp; net displacement / cargo are therefore validated to within ~0.5 MT.
/// (Exact agreement is obtained when fed the unrounded hydrostatic values from the ship's tables.)
/// </summary>
public class DraftSurveyTests
{
    // ----- Initial survey (light/arrival) -----
    private static readonly DraftSurveyInput Initial = new()
    {
        ForwardCorrected = 4.466,
        AftCorrected = 6.804,
        MidshipCorrected = 5.553,
        Lbp = 175.0,
        SeaWaterDensity = 1.0165,
        Hydrostatics = new Hydrostatics(
            DisplacementAtQuarterMean: 23771.25,
            Tpc: 46.2,
            Lcf: -5.448,
            MtcPerMetre: 28.5),
        TotalDeductibles = 6662.941,
    };

    // ----- Final survey (loaded/departure) -----
    private static readonly DraftSurveyInput Final = new()
    {
        ForwardCorrected = 4.081,
        AftCorrected = 6.513,
        MidshipCorrected = 5.217,
        Lbp = 175.0,
        SeaWaterDensity = 1.018,
        Hydrostatics = new Hydrostatics(
            DisplacementAtQuarterMean: 22219.995,
            Tpc: 45.9,
            Lcf: -5.85775,
            MtcPerMetre: 28.0),
        TotalDeductibles = 7532.030,
    };

    [Fact]
    public void QuarterMean_and_trim_match_worksheet()
    {
        var r = DraftSurveyCalculator.Calculate(Initial);
        Assert.Equal(5.5735, r.QuarterMeanDraft, 4);   // worksheet "Quarter Mean"
        Assert.Equal(2.338, r.CorrectedTrim, 3);        // worksheet "Corrected Trim"
    }

    [Fact]
    public void TrimAndDensityCorrections_match_worksheet()
    {
        var r = DraftSurveyCalculator.Calculate(Initial);
        Assert.Equal(44.511, r.SecondTrimCorrection, 1);  // worksheet +44.511 MT
        Assert.Equal(-194.708, r.DensityCorrection, 0);    // worksheet −194.708 MT
    }

    [Fact]
    public void NetDisplacements_match_worksheet()
    {
        var init = DraftSurveyCalculator.Calculate(Initial);
        var fin = DraftSurveyCalculator.Calculate(Final);
        Assert.Equal(16621.844, init.NetDisplacement, 0); // worksheet 16,621.844 MT (±0.5)
        Assert.Equal(14212.111, fin.NetDisplacement, 0);  // worksheet 14,212.111 MT (±0.5)
    }

    [Fact]
    public void CargoDischarged_matches_worksheet()
    {
        var init = DraftSurveyCalculator.Calculate(Initial);
        var fin = DraftSurveyCalculator.Calculate(Final);
        double cargo = DraftSurveyCalculator.CargoByDifference(init.NetDisplacement, fin.NetDisplacement);
        Assert.Equal(2409.733, cargo, 0); // worksheet figure: Cargo Discharged 2,409.733 MT (±0.5)
    }
}
