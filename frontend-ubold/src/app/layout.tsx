import type { Metadata } from 'next'

import AppWrapper from '@/components/AppWrapper'

import { appDescription, appTitle } from '@/helpers'
import { ChildrenType } from '@/types'

import 'datatables.net-buttons-bs5/css/buttons.bootstrap5.min.css'
import 'datatables.net-fixedheader-bs5/css/fixedHeader.bootstrap5.min.css'
import 'datatables.net-responsive-bs5/css/responsive.bootstrap5.min.css'
import 'datatables.net-select-bs5/css/select.bootstrap5.min.css'
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css'
import 'filepond/dist/filepond.min.css'
import 'flatpickr/dist/flatpickr.min.css'
import 'jsvectormap/dist/css/jsvectormap.min.css'
import 'ladda/dist/ladda.min.css'
import 'leaflet/dist/leaflet.css'
import 'react-bootstrap-typeahead/css/Typeahead.css'
import 'react-datepicker/dist/react-datepicker.min.css'
import 'react-day-picker/style.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-quill-new/dist/quill.bubble.css'
import 'react-quill-new/dist/quill.core.css'
import 'react-quill-new/dist/quill.snow.css'
import 'simplebar-react/dist/simplebar.min.css'
import 'sweetalert2/dist/sweetalert2.min.css'

import '@/assets/scss/app.scss'
import { ibmPlexSans, inter, nunito, poppins, publicSans, roboto } from '@/helpers/fonts'


const faviconSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">
    <path d="M43.28,13.97c0,34.74,28.12,62.89,62.79,62.89,5.76,0,11.34-.79,16.65-2.26L106.08,13.97H43.28Z" fill="black"/>
    <path d="M74.91,68.53l-42.93-12.18L10.36,136.65H56.83l18.08-68.12Z" fill="black"/>
    <path d="M80.06,86.92l42.66-12.31,16.78,62.04h-46.46l-12.98-49.73Z" fill="black"/>
  </svg>
`)

export const metadata: Metadata = {
    title: {
        default: appTitle,
        template: '%s | ' + appTitle,
    },
    description: appDescription,
    icons: {
        icon: `data:image/svg+xml,${faviconSvg}`,
        shortcut: `data:image/svg+xml,${faviconSvg}`,
        apple: `data:image/svg+xml,${faviconSvg}`,
    },
    other: {
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.getstream.io https://*.stream-io-api.com https://getstream.io",
            "style-src 'self' 'unsafe-inline' https://*.getstream.io",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' data: https:",
            "connect-src 'self' https://*.getstream.io https://*.stream-io-api.com https://getstream.io wss://*.getstream.io ws://*.getstream.io wss://*.stream-io-api.com ws://*.stream-io-api.com wss://chat.stream-io-api.com",
            "frame-src 'self' https://*.getstream.io",
            "worker-src 'self' blob:",
            "child-src 'self' blob:",
        ].join('; '),
    },
}

const RootLayout = ({ children }: ChildrenType) => {
    return (
        <html lang="en" className={`${nunito.variable} ${publicSans.variable} ${poppins.variable} ${roboto.variable} ${inter.variable} ${ibmPlexSans.variable}`}>
            <body>
                <AppWrapper>{children}</AppWrapper>
            </body>
        </html>
    )
}

export default RootLayout
