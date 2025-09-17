import React from 'react'

export default function ReportCard({ title, subtitle, children, icon }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h4>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-300">{subtitle}</p>}
        </div>
        {icon && <div className="text-2xl ml-4">{icon}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}
