import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { MantineProvider, createTheme } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import './index.css'
import App from './App.jsx'

const theme = createTheme({
  primaryColor: 'lime',
  fontFamily: 'Inter, Arial, sans-serif',
  headings: {
    fontFamily: 'Inter, Arial, sans-serif',
    fontWeight: '900',
  },
  defaultRadius: 'lg',
  colors: {
    bytNavy: [
      '#f4f7fb',
      '#e5ebf4',
      '#c8d3e4',
      '#a8b9d1',
      '#8da4c1',
      '#7895b5',
      '#6687a9',
      '#526f8f',
      '#445b75',
      '#263346',
    ],
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Card: {
      defaultProps: {
        radius: 'xl',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'lg',
        size: 'md',
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: 'lg',
        size: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'lg',
        size: 'md',
      },
    },
    NumberInput: {
      defaultProps: {
        radius: 'lg',
        size: 'md',
      },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <DatesProvider settings={{ firstDayOfWeek: 1, consistentWeeks: true }}>
        <App />
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
)
