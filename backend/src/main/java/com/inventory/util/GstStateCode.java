package com.inventory.util;
import java.util.LinkedHashMap;
import java.util.Map;

public final class GstStateCode {
    private GstStateCode() {}
    public static final Map<String,String> STATES = new LinkedHashMap<>(){{
        put("07","Delhi"); put("09","Uttar Pradesh"); put("19","West Bengal");
        put("24","Gujarat"); put("27","Maharashtra"); put("29","Karnataka");
        put("32","Kerala"); put("33","Tamil Nadu"); put("36","Telangana");
    }};
    public static String getStateName(String code) { return STATES.getOrDefault(code,"Unknown"); }
    public static String getStateCodeFromGstin(String gstin) { return gstin!=null&&gstin.length()>=2?gstin.substring(0,2):null; }
    public static boolean isValidGstin(String gstin) { return gstin!=null&&gstin.matches("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"); }
    public static boolean isIntraState(String s,String b) { if(s==null||b==null) return true; return getStateCodeFromGstin(s).equalsIgnoreCase(getStateCodeFromGstin(b)); }
}
