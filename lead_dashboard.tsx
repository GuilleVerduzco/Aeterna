/**
 * 📊 DASHBOARD ÆTERNA - Lead Generation Analytics
 * Sistema de visualización en tiempo real para generación de leads en México
 *
 * Diseño: Identidad Æterna (Instrument Serif + Manrope + JetBrains Mono)
 * Colores: 80% tinta/crema, 15% piedra, 5% oro
 */

'use client'

import React, { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// ============================================================================
// TIPOS DE DATOS
// ============================================================================

interface Lead {
  id: string
  nombre: string
  email?: string
  telefono?: string
  ubicacion: string
  negocio: string
  tipo_negocio: string
  fuente: string
  potencial: 'Alto' | 'Medio' | 'Bajo'
  contacto_url?: string
  fecha_extraido: string
}

interface DashboardStats {
  total_leads: number
  leads_alto_potencial: number
  tasa_conversion: number
  ingresos_proyectados: number
  leads_este_mes: number
  clientes_proximos: number
}

interface AnalyticsData {
  leads_por_fuente: Array<{ fuente: string; cantidad: number }>
  leads_por_tipo: Array<{ tipo: string; cantidad: number }>
  leads_por_potencial: Array<{ potencial: string; cantidad: number; fill: string }>
  tendencia_7_dias: Array<{ dia: string; cantidad: number }>
  proyeccion_30_dias: Array<{ dia: number; leads: number; conversiones: number; ingresos: number }>
}

// ============================================================================
// TOKENS DE DISEÑO ÆTERNA
// ============================================================================

const TOKENS = {
  colors: {
    tinta: '#0D1117',      // 80% - fondo oscuro
    crema: '#F7F5F0',      // 80% - fondo claro
    piedra: '#6B7280',     // 15% - neutral/grafito
    oro: '#C9A96E',        // 5% - accents/CTAs
    fondo_claro: '#FAFAF8',
    fondo_oscuro: '#0A0E14',
  },
  fonts: {
    serif: "'Instrument Serif', serif",
    sans: "'Manrope', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
}

// ============================================================================
// COMPONENTES REUTILIZABLES
// ============================================================================

interface StatCardProps {
  label: string
  valor: string | number
  subtexto?: string
  destaque?: boolean
  icono?: string
}

const StatCard: React.FC<StatCardProps> = ({ label, valor, subtexto, destaque = false, icono }) => (
  <div
    style={{
      backgroundColor: destaque ? TOKENS.colors.oro : TOKENS.colors.crema,
      border: `1px solid ${TOKENS.colors.piedra}33`,
      borderRadius: '4px',
      padding: TOKENS.spacing.md,
      display: 'flex',
      flexDirection: 'column',
      gap: TOKENS.spacing.sm,
    }}
  >
    <div style={{ fontSize: '0.875rem', color: TOKENS.colors.piedra, fontFamily: TOKENS.fonts.mono, letterSpacing: '0.05em' }}>
      {label.toUpperCase()}
    </div>
    <div
      style={{
        fontSize: '2rem',
        fontWeight: 700,
        fontFamily: destaque ? TOKENS.fonts.mono : TOKENS.fonts.serif,
        color: destaque ? TOKENS.colors.tinta : TOKENS.colors.tinta,
      }}
    >
      {icono} {valor}
    </div>
    {subtexto && (
      <div style={{ fontSize: '0.75rem', color: TOKENS.colors.piedra, fontFamily: TOKENS.fonts.sans }}>
        {subtexto}
      </div>
    )}
  </div>
)

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      backgroundColor: variant === 'primary' ? TOKENS.colors.oro : 'transparent',
      color: variant === 'primary' ? TOKENS.colors.tinta : TOKENS.colors.oro,
      border: `1px solid ${variant === 'primary' ? TOKENS.colors.oro : TOKENS.colors.oro}`,
      borderRadius: '4px',
      padding: `${TOKENS.spacing.sm} ${TOKENS.spacing.md}`,
      fontFamily: TOKENS.fonts.sans,
      fontSize: '0.875rem',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.2s ease',
      letterSpacing: '0.05em',
    }}
    onMouseOver={(e) => {
      if (!disabled && variant === 'primary') {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = TOKENS.colors.tinta
        ;(e.currentTarget as HTMLButtonElement).style.color = TOKENS.colors.crema
      }
    }}
    onMouseOut={(e) => {
      if (!disabled && variant === 'primary') {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = TOKENS.colors.oro
        ;(e.currentTarget as HTMLButtonElement).style.color = TOKENS.colors.tinta
      }
    }}
  >
    {children}
  </button>
)

// ============================================================================
// SECCIONES DEL DASHBOARD
// ============================================================================

const HeaderSection: React.FC = () => (
  <div
    style={{
      backgroundColor: TOKENS.colors.tinta,
      color: TOKENS.colors.crema,
      padding: TOKENS.spacing.xl,
      marginBottom: TOKENS.spacing.lg,
      borderBottom: `2px solid ${TOKENS.colors.oro}`,
    }}
  >
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ fontSize: '0.875rem', fontFamily: TOKENS.fonts.mono, letterSpacing: '0.35em', color: TOKENS.colors.oro, marginBottom: TOKENS.spacing.sm }}>
        MICROSERVICIOS IA
      </div>
      <h1
        style={{
          fontSize: '3rem',
          fontFamily: TOKENS.fonts.serif,
          margin: '0 0 0.5rem 0',
          fontWeight: 400,
        }}
      >
        Æterna
        <span style={{ color: TOKENS.colors.oro, marginLeft: '0.25rem' }}>·</span>
      </h1>
      <p
        style={{
          fontSize: '1rem',
          color: TOKENS.colors.piedra,
          margin: 0,
          fontFamily: TOKENS.fonts.sans,
        }}
      >
        Dashboard de generación de leads para servicios digitales en México
      </p>
    </div>
  </div>
)

interface StatsSectionProps {
  stats: DashboardStats
}

const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: TOKENS.spacing.md,
      marginBottom: TOKENS.spacing.lg,
    }}
  >
    <StatCard label="Total de Leads" valor={stats.total_leads.toLocaleString('es-MX')} subtexto="Acumulados este año" />
    <StatCard
      label="Potencial Alto"
      valor={stats.leads_alto_potencial}
      subtexto={`${((stats.leads_alto_potencial / stats.total_leads) * 100).toFixed(0)}% del total`}
      destaque
    />
    <StatCard label="Conversiones" valor={`${(stats.tasa_conversion * 100).toFixed(1)}%`} subtexto="Tasa de conversión" />
    <StatCard
      label="Ingresos Proyectados"
      valor={`$${(stats.ingresos_proyectados / 1000).toFixed(0)}K`}
      subtexto="Anual (MRR×12)"
      icono="💰"
    />
  </div>
)

interface AnalyticsSectionProps {
  data: AnalyticsData
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ data }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: TOKENS.spacing.lg, marginBottom: TOKENS.spacing.lg }}>
    {/* Leads por Fuente */}
    <div style={{ backgroundColor: TOKENS.colors.crema, padding: TOKENS.spacing.md, borderRadius: '4px', border: `1px solid ${TOKENS.colors.piedra}33` }}>
      <h3 style={{ fontFamily: TOKENS.fonts.serif, fontSize: '1.25rem', margin: `0 0 ${TOKENS.spacing.md} 0` }}>
        Leads por Fuente
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.leads_por_fuente}>
          <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.colors.piedra}33 />
          <XAxis dataKey="fuente" tick={{ fontSize: 12, fontFamily: TOKENS.fonts.sans }} />
          <YAxis tick={{ fontSize: 12, fontFamily: TOKENS.fonts.mono }} />
          <Tooltip
            contentStyle={{ backgroundColor: TOKENS.colors.tinta, border: `1px solid ${TOKENS.colors.oro}`, borderRadius: '4px' }}
            labelStyle={{ color: TOKENS.colors.crema, fontFamily: TOKENS.fonts.mono }}
          />
          <Bar dataKey="cantidad" fill={TOKENS.colors.oro} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>

    {/* Leads por Tipo de Negocio */}
    <div style={{ backgroundColor: TOKENS.colors.crema, padding: TOKENS.spacing.md, borderRadius: '4px', border: `1px solid ${TOKENS.colors.piedra}33` }}>
      <h3 style={{ fontFamily: TOKENS.fonts.serif, fontSize: '1.25rem', margin: `0 0 ${TOKENS.spacing.md} 0` }}>
        Por Tipo de Negocio
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data.leads_por_tipo} cx="50%" cy="50%" labelLine={false} label={({ tipo, cantidad }) => `${tipo}: ${cantidad}`} outerRadius={80} fill={TOKENS.colors.piedra} dataKey="cantidad">
            {data.leads_por_tipo.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? TOKENS.colors.oro : index === 1 ? TOKENS.colors.piedra : TOKENS.colors.crema} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: TOKENS.colors.tinta, border: `1px solid ${TOKENS.colors.oro}`, borderRadius: '4px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>

    {/* Tendencia 7 días */}
    <div style={{ backgroundColor: TOKENS.colors.crema, padding: TOKENS.spacing.md, borderRadius: '4px', border: `1px solid ${TOKENS.colors.piedra}33`, gridColumn: '1 / -1' }}>
      <h3 style={{ fontFamily: TOKENS.fonts.serif, fontSize: '1.25rem', margin: `0 0 ${TOKENS.spacing.md} 0` }}>
        Tendencia Últimos 7 Días
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data.tendencia_7_dias}>
          <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.colors.piedra}33 />
          <XAxis dataKey="dia" tick={{ fontSize: 12, fontFamily: TOKENS.fonts.sans }} />
          <YAxis tick={{ fontSize: 12, fontFamily: TOKENS.fonts.mono }} />
          <Tooltip
            contentStyle={{ backgroundColor: TOKENS.colors.tinta, border: `1px solid ${TOKENS.colors.oro}`, borderRadius: '4px' }}
            labelStyle={{ color: TOKENS.colors.crema, fontFamily: TOKENS.fonts.mono }}
          />
          <Line type="monotone" dataKey="cantidad" stroke={TOKENS.colors.oro} strokeWidth={2} dot={{ fill: TOKENS.colors.oro, r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)

// ============================================================================
// TABLA DE LEADS RECIENTES
// ============================================================================

interface LeadsTableProps {
  leads: Lead[]
}

const LeadsTable: React.FC<LeadsTableProps> = ({ leads }) => (
  <div style={{ backgroundColor: TOKENS.colors.crema, borderRadius: '4px', border: `1px solid ${TOKENS.colors.piedra}33`, overflow: 'hidden' }}>
    <div style={{ padding: TOKENS.spacing.md, borderBottom: `1px solid ${TOKENS.colors.piedra}33` }}>
      <h3 style={{ fontFamily: TOKENS.fonts.serif, fontSize: '1.25rem', margin: 0 }}>
        Leads Recientes
      </h3>
    </div>
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: TOKENS.fonts.sans,
          fontSize: '0.875rem',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: TOKENS.colors.piedra + '08', borderBottom: `1px solid ${TOKENS.colors.piedra}33` }}>
            <th style={{ padding: TOKENS.spacing.md, textAlign: 'left', fontWeight: 600, color: TOKENS.colors.tinta }}>Negocio</th>
            <th style={{ padding: TOKENS.spacing.md, textAlign: 'left', fontWeight: 600, color: TOKENS.colors.tinta }}>Tipo</th>
            <th style={{ padding: TOKENS.spacing.md, textAlign: 'left', fontWeight: 600, color: TOKENS.colors.tinta }}>Ubicación</th>
            <th style={{ padding: TOKENS.spacing.md, textAlign: 'left', fontWeight: 600, color: TOKENS.colors.tinta }}>Fuente</th>
            <th style={{ padding: TOKENS.spacing.md, textAlign: 'center', fontWeight: 600, color: TOKENS.colors.tinta }}>Potencial</th>
            <th style={{ padding: TOKENS.spacing.md, textAlign: 'left', fontWeight: 600, color: TOKENS.colors.tinta }}>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {leads.slice(0, 10).map((lead, idx) => (
            <tr key={lead.id} style={{ borderBottom: `1px solid ${TOKENS.colors.piedra}33`, backgroundColor: idx % 2 === 0 ? 'transparent' : TOKENS.colors.piedra + '04' }}>
              <td style={{ padding: TOKENS.spacing.md, color: TOKENS.colors.tinta, fontWeight: 500 }}>
                {lead.negocio.substring(0, 40)}...
              </td>
              <td style={{ padding: TOKENS.spacing.md, color: TOKENS.colors.piedra }}>
                {lead.tipo_negocio}
              </td>
              <td style={{ padding: TOKENS.spacing.md, color: TOKENS.colors.piedra }}>
                {lead.ubicacion}
              </td>
              <td style={{ padding: TOKENS.spacing.md, color: TOKENS.colors.piedra, fontFamily: TOKENS.fonts.mono, fontSize: '0.75rem' }}>
                {lead.fuente.split('.')[0].toUpperCase()}
              </td>
              <td
                style={{
                  padding: TOKENS.spacing.md,
                  textAlign: 'center',
                  backgroundColor: lead.potencial === 'Alto' ? TOKENS.colors.oro + '20' : lead.potencial === 'Medio' ? TOKENS.colors.piedra + '20' : TOKENS.colors.piedra + '10',
                  color: lead.potencial === 'Alto' ? TOKENS.colors.oro : TOKENS.colors.piedra,
                  fontWeight: 600,
                  borderRadius: '4px',
                }}
              >
                {lead.potencial}
              </td>
              <td style={{ padding: TOKENS.spacing.md, color: TOKENS.colors.piedra, fontSize: '0.75rem', fontFamily: TOKENS.fonts.mono }}>
                {new Date(lead.fecha_extraido).toLocaleDateString('es-MX')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

// ============================================================================
// COMPONENTE PRINCIPAL DEL DASHBOARD
// ============================================================================

export default function LeadDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_leads: 847,
    leads_alto_potencial: 567,
    tasa_conversion: 0.067,
    ingresos_proyectados: 156000,
    leads_este_mes: 98,
    clientes_proximos: 5,
  })

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    leads_por_fuente: [
      { fuente: 'Shopee.mx', cantidad: 342 },
      { fuente: 'OLX.mx', cantidad: 218 },
      { fuente: 'Google Maps', cantidad: 189 },
      { fuente: 'Facebook', cantidad: 98 },
    ],
    leads_por_tipo: [
      { tipo: 'E-commerce', cantidad: 389 },
      { tipo: 'Restaurante', cantidad: 234 },
      { tipo: 'Servicio Local', cantidad: 156 },
      { tipo: 'Otros', cantidad: 68 },
    ],
    leads_por_potencial: [
      { potencial: 'Alto', cantidad: 567, fill: '#C9A96E' },
      { potencial: 'Medio', cantidad: 234, fill: '#6B7280' },
      { potencial: 'Bajo', cantidad: 46, fill: '#E5E7EB' },
    ],
    tendencia_7_dias: [
      { dia: 'Lun', cantidad: 42 },
      { dia: 'Mar', cantidad: 56 },
      { dia: 'Mié', cantidad: 48 },
      { dia: 'Jue', cantidad: 63 },
      { dia: 'Vie', cantidad: 71 },
      { dia: 'Sáb', cantidad: 38 },
      { dia: 'Dom', cantidad: 29 },
    ],
    proyeccion_30_dias: [],
  })

  const [leads, setLeads] = useState<Lead[]>([
    {
      id: '1',
      nombre: 'María García',
      email: 'maria@tienda.mx',
      telefono: '+525512345678',
      ubicacion: 'Mexico',
      negocio: 'Tienda online: ropa y accesorios',
      tipo_negocio: 'E-commerce',
      fuente: 'Shopee.com.mx',
      potencial: 'Alto',
      fecha_extraido: '2026-09-19T10:30:00',
    },
    {
      id: '2',
      nombre: 'Carlos López',
      email: 'info@restaurant.mx',
      telefono: '+525533445566',
      ubicacion: 'Guadalajara',
      negocio: 'Restaurante La Cocina',
      tipo_negocio: 'Restaurante',
      fuente: 'Google Maps',
      potencial: 'Alto',
      fecha_extraido: '2026-09-19T09:15:00',
    },
  ])

  return (
    <div style={{ backgroundColor: TOKENS.colors.crema, minHeight: '100vh', fontFamily: TOKENS.fonts.sans, color: TOKENS.colors.tinta }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: ${TOKENS.fonts.sans};
          background-color: ${TOKENS.colors.crema};
          color: ${TOKENS.colors.tinta};
        }

        h1, h2, h3, h4, h5, h6 {
          font-family: ${TOKENS.fonts.serif};
        }

        code, pre {
          font-family: ${TOKENS.fonts.mono};
        }

        a {
          color: ${TOKENS.colors.oro};
          text-decoration: none;
          border-bottom: 1px solid ${TOKENS.colors.oro};
        }

        a:hover {
          color: ${TOKENS.colors.tinta};
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: ${TOKENS.colors.crema};
        }

        ::-webkit-scrollbar-thumb {
          background: ${TOKENS.colors.piedra};
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${TOKENS.colors.tinta};
        }
      `}</style>

      <HeaderSection />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: `0 ${TOKENS.spacing.lg}` }}>
        {/* CONTROLES */}
        <div
          style={{
            display: 'flex',
            gap: TOKENS.spacing.md,
            marginBottom: TOKENS.spacing.lg,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <select
            style={{
              padding: `${TOKENS.spacing.sm} ${TOKENS.spacing.md}`,
              borderRadius: '4px',
              border: `1px solid ${TOKENS.colors.piedra}33`,
              fontFamily: TOKENS.fonts.sans,
              backgroundColor: TOKENS.colors.crema,
              color: TOKENS.colors.tinta,
              cursor: 'pointer',
            }}
          >
            <option>Últimos 30 días</option>
            <option>Últimos 7 días</option>
            <option>Hoy</option>
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: TOKENS.spacing.sm }}>
            <Button variant="secondary">↓ Exportar CSV</Button>
            <Button>▶ Ejecutar Scraper</Button>
          </div>
        </div>

        {/* MÉTRICAS CLAVE */}
        <StatsSection stats={stats} />

        {/* GRÁFICOS ANALÍTICOS */}
        <AnalyticsSection data={analytics} />

        {/* TABLA DE LEADS */}
        <div style={{ marginBottom: TOKENS.spacing.xl }}>
          <LeadsTable leads={leads} />
        </div>

        {/* FOOTER */}
        <footer
          style={{
            borderTop: `1px solid ${TOKENS.colors.piedra}33`,
            paddingTop: TOKENS.spacing.lg,
            paddingBottom: TOKENS.spacing.xl,
            marginTop: TOKENS.spacing.xl,
            color: TOKENS.colors.piedra,
            fontSize: '0.875rem',
            fontFamily: TOKENS.fonts.sans,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: TOKENS.spacing.lg, marginBottom: TOKENS.spacing.lg }}>
            <div>
              <h4 style={{ fontFamily: TOKENS.fonts.serif, marginBottom: TOKENS.spacing.sm, color: TOKENS.colors.tinta }}>
                Æterna
              </h4>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                Microservicios IA para empresas en LATAM
              </p>
            </div>
            <div>
              <h4 style={{ fontFamily: TOKENS.fonts.serif, marginBottom: TOKENS.spacing.sm, color: TOKENS.colors.tinta }}>
                Contacto
              </h4>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                CEO Guillermo Verduzco
                <br />
                <a href="https://wa.me/528114750015" style={{ fontSize: '0.875rem' }}>WhatsApp 81 1475 0015</a>
                <br />
                <a href="mailto:info@c4b.mx" style={{ fontSize: '0.875rem' }}>info@c4b.mx</a>
              </p>
            </div>
            <div>
              <h4 style={{ fontFamily: TOKENS.fonts.serif, marginBottom: TOKENS.spacing.sm, color: TOKENS.colors.tinta }}>
                Enlaces
              </h4>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                <a href="https://www.c4b.mx" style={{ fontSize: '0.875rem' }}>www.c4b.mx</a>
                <br />
                <a href="https://github.com/GuilleVerduzco/Aeterna" style={{ fontSize: '0.875rem' }}>GitHub Repository</a>
              </p>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${TOKENS.colors.piedra}33`, paddingTop: TOKENS.spacing.md, textAlign: 'center' }}>
            © 2026 Æterna. Todos los derechos reservados.
          </div>
        </footer>
      </main>
    </div>
  )
}
