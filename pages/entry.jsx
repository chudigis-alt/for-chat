import React from 'react';
import {createRoot} from 'react-dom/client';
import Storefront from '../src/main.jsx';
import '../src/style.css';
import '../src/revised.css';
import '../src/accessibility.css';
createRoot(document.getElementById('root')).render(<><div className="pages-preview-notice"><strong>Design preview</strong> — Sample stock. Orders, payments and admin changes are disabled.</div><Storefront/></>);
