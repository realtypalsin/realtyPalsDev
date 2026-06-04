import ProjectForm from '@/components/admin/ProjectForm'

export default function NewProject() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Add Project</h1>
        <p className="text-sm text-gray-500 mt-1">Add a new property to the database</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <ProjectForm />
      </div>
    </div>
  )
}
