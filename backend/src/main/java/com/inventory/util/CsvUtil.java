package com.inventory.util;

import java.util.List;

public final class CsvUtil {

    private CsvUtil() {}

    public static String escape(Object value) {
        if (value == null) return "";
        String s = value.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    public static String row(Object... values) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < values.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(escape(values[i]));
        }
        sb.append('\n');
        return sb.toString();
    }

    public static String build(List<String> header, List<Object[]> rows) {
        StringBuilder sb = new StringBuilder();
        sb.append(row(header.toArray()));
        for (Object[] r : rows) sb.append(row(r));
        return sb.toString();
    }
}
