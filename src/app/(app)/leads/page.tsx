import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "@/components/leads/data-table";
import { columns } from "@/components/leads/columns";
import { leads } from "@/lib/data";

export default function LeadsPage() {
  return (
    <div>
      <PageHeader title="Leads" description="Manage your approved real estate agent leads.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </PageHeader>
      <DataTable columns={columns} data={leads} />
    </div>
  );
}
