namespace SuperSurvey.Calculations.DraftSurvey;

/// <summary>
/// Hydrostatic particulars read (interpolated) from the vessel's hydrostatic tables /
/// deadweight scale at the quarter-mean draft. Tables are tabulated on a 1.025 t/m³ basis.
/// </summary>
/// <param name="DisplacementAtQuarterMean">Displacement (MT) at the quarter-mean draft.</param>
/// <param name="Tpc">Tonnes Per Centimetre immersion at the quarter-mean draft.</param>
/// <param name="Lcf">Longitudinal Centre of Flotation distance from amidships (m). Forward of amidships = negative.</param>
/// <param name="MtcPerMetre">dm/dz = MTC(+0.5 m) − MTC(−0.5 m): change of Moment to Trim per 1 m of draft.</param>
public readonly record struct Hydrostatics(
    double DisplacementAtQuarterMean,
    double Tpc,
    double Lcf,
    double MtcPerMetre);

/// <summary>
/// Inputs for one draft (draught) survey condition. Drafts are supplied already corrected to the
/// perpendiculars/amidships (the raw mark → perpendicular correction is applied upstream, using the
/// vessel's mark geometry per the UNECE code).
/// </summary>
public sealed record DraftSurveyInput
{
    /// <summary>Forward draft corrected to the forward perpendicular (m).</summary>
    public required double ForwardCorrected { get; init; }

    /// <summary>Aft draft corrected to the aft perpendicular (m).</summary>
    public required double AftCorrected { get; init; }

    /// <summary>Midship draft corrected to amidships (m).</summary>
    public required double MidshipCorrected { get; init; }

    /// <summary>Length Between Perpendiculars (m).</summary>
    public required double Lbp { get; init; }

    /// <summary>Observed dock / sea water density (t/m³).</summary>
    public required double SeaWaterDensity { get; init; }

    public required Hydrostatics Hydrostatics { get; init; }

    /// <summary>Sum of all non-cargo weights (MT): ballast, fresh water, fuel oil, diesel, lube, slops, other.</summary>
    public double TotalDeductibles { get; init; }
}

/// <summary>Intermediate and final results of a draft survey condition.</summary>
public sealed record DraftSurveyResult
{
    public required double MeanOfForwardAndAft { get; init; }
    public required double QuarterMeanDraft { get; init; }
    public required double CorrectedTrim { get; init; }
    public required double FirstTrimCorrection { get; init; }
    public required double SecondTrimCorrection { get; init; }
    public required double DisplacementCorrectedForTrim { get; init; }
    public required double DensityCorrection { get; init; }
    public required double DisplacementCorrectedForDensity { get; init; }
    public required double NetDisplacement { get; init; }
}

/// <summary>
/// Draft (draught) survey displacement calculation, per the UNECE "Code of Uniform Standards and
/// Procedures for the Performance of Draught Surveys".
/// Validated against the SGS Panamá worksheet "DRAFT SURVEY - MV BELLE PLAINE 238579.xls".
/// </summary>
public static class DraftSurveyCalculator
{
    /// <summary>Standard salt-water density (t/m³) on which hydrostatic tables are based.</summary>
    public const double StandardSeaWaterDensity = 1.025;

    public static DraftSurveyResult Calculate(DraftSurveyInput i)
    {
        double meanFa = (i.ForwardCorrected + i.AftCorrected) / 2.0;

        // Quarter mean ("mean of mean of means"): (F + A + 6·M) / 8.
        // The 6× midship weighting also applies the hog/sag (deflection) correction.
        double quarterMean = (i.ForwardCorrected + i.AftCorrected + 6.0 * i.MidshipCorrected) / 8.0;

        double trim = i.AftCorrected - i.ForwardCorrected; // +ve by the stern

        var h = i.Hydrostatics;

        // First trim (layer) correction: (trim_cm · LCF · TPC) / LBP.
        double tc1 = (trim * 100.0 * h.Lcf * h.Tpc) / i.Lbp;

        // Second trim correction (Nemoto): (trim_m² · 50 · dm/dz) / LBP — always additive.
        double tc2 = (trim * trim * 50.0 * h.MtcPerMetre) / i.Lbp;

        double dispTrim = h.DisplacementAtQuarterMean + tc1 + tc2;

        // Density correction to the observed dock-water density.
        double densCorr = dispTrim * (i.SeaWaterDensity - StandardSeaWaterDensity) / StandardSeaWaterDensity;
        double dispDensity = dispTrim + densCorr;

        double net = dispDensity - i.TotalDeductibles;

        return new DraftSurveyResult
        {
            MeanOfForwardAndAft = meanFa,
            QuarterMeanDraft = quarterMean,
            CorrectedTrim = trim,
            FirstTrimCorrection = tc1,
            SecondTrimCorrection = tc2,
            DisplacementCorrectedForTrim = dispTrim,
            DensityCorrection = densCorr,
            DisplacementCorrectedForDensity = dispDensity,
            NetDisplacement = net,
        };
    }

    /// <summary>
    /// Cargo by difference of two survey conditions.
    /// Loaded = net(final) − net(initial); Discharged = net(initial) − net(final).
    /// Light ship and the ship's constant cancel in the difference.
    /// </summary>
    public static double CargoByDifference(double netDisplacementFrom, double netDisplacementTo)
        => netDisplacementFrom - netDisplacementTo;
}
