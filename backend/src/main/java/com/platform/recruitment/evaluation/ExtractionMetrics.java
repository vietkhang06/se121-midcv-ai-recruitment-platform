package com.platform.recruitment.evaluation;

import java.util.*;

/**
 * Deterministic evaluation utility for information extraction and normalization.
 * Computes True Positives (TP), False Positives (FP), False Negatives (FN),
 * Precision, Recall, and F1 score against labeled ground-truth sets.
 */
public class ExtractionMetrics {
    private final int tp;
    private final int fp;
    private final int fn;
    private final double precision;
    private final double recall;
    private final double f1;

    public ExtractionMetrics(int tp, int fp, int fn, double precision, double recall, double f1) {
        this.tp = tp;
        this.fp = fp;
        this.fn = fn;
        this.precision = precision;
        this.recall = recall;
        this.f1 = f1;
    }

    public static ExtractionMetrics evaluate(Collection<String> predicted, Collection<String> groundTruth) {
        Set<String> predSet = new HashSet<>();
        if (predicted != null) {
            for (String p : predicted) {
                if (p != null && !p.trim().isEmpty()) {
                    predSet.add(p.trim().toLowerCase(Locale.ROOT));
                }
            }
        }

        Set<String> gtSet = new HashSet<>();
        if (groundTruth != null) {
            for (String g : groundTruth) {
                if (g != null && !g.trim().isEmpty()) {
                    gtSet.add(g.trim().toLowerCase(Locale.ROOT));
                }
            }
        }

        int tp = 0;
        for (String p : predSet) {
            if (gtSet.contains(p)) {
                tp++;
            }
        }

        int fp = predSet.size() - tp;
        int fn = gtSet.size() - tp;

        double precision = (tp + fp) > 0 ? (double) tp / (tp + fp) : (gtSet.isEmpty() ? 1.0 : 0.0);
        double recall = (tp + fn) > 0 ? (double) tp / (tp + fn) : (gtSet.isEmpty() ? 1.0 : 0.0);
        double f1 = (precision + recall) > 0 ? (2.0 * precision * recall) / (precision + recall) : 0.0;

        return new ExtractionMetrics(tp, fp, fn, precision, recall, f1);
    }

    public int getTp() { return tp; }
    public int getFp() { return fp; }
    public int getFn() { return fn; }
    public double getPrecision() { return precision; }
    public double getRecall() { return recall; }
    public double getF1() { return f1; }

    @Override
    public String toString() {
        return String.format("ExtractionMetrics[TP=%d, FP=%d, FN=%d, Precision=%.4f, Recall=%.4f, F1=%.4f]",
                tp, fp, fn, precision, recall, f1);
    }
}
