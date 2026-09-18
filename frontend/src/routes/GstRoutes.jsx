import React from'react';import{Routes,Route}from'react-router-dom';
import GstDashboard from'../pages/gst/GstDashboard';
import GstConfig from'../pages/gst/GstConfig';
import GstInvoicePages from'../pages/gst/GstInvoicePages';
import GenerateGstInvoice from'../pages/gst/GenerateGstInvoice';
import HsnSacCodes from'../pages/gst/HsnSacCodes';
import GstPages1 from'../pages/gst/GstPages1';
import GstReports from'../pages/gst/GstReports';

export default function GstRoutes(){
  return(<Routes>
    <Route index element={<GstDashboard/>}/>
    <Route path="config" element={<GstConfig/>}/>
    <Route path="invoices" element={<GstInvoicePages/>}/>
    <Route path="invoices/new" element={<GenerateGstInvoice/>}/>
    <Route path="gstr1" element={<GstPages1 page="gstr1"/>}/>
    <Route path="returns" element={<GstPages1 page="returns"/>}/>
    <Route path="calculator" element={<GstPages1 page="calculator"/>}/>
    <Route path="hsn-sac" element={<HsnSacCodes/>}/>
    <Route path="reports" element={<GstReports/>}/>
  </Routes>);
}
