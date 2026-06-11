import { Badge, Button, Table } from "@mantine/core";

function MemberTable({ filteredMembers, formatMoney, onEditMember }) {
  function getMemberStatus(member) {
    if (member.status === "inactive") {
      return { label: "Inactive", color: "gray" };
    }

    if (member.status === "pending") {
      return { label: "Pending Approval", color: "yellow" };
    }

    if (member.balance < 0) {
      return { label: "Need Reload", color: "red" };
    }

    if (member.balance < 30) {
      return { label: "Low Balance", color: "orange" };
    }

    return { label: "Good", color: "green" };
  }

  return (
    <div className="member-table-scroll">
      <Table className="premium-table" striped highlightOnHover verticalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Member</Table.Th>
            <Table.Th>Balance</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {filteredMembers.map((member) => (
            <Table.Tr key={member.id}>
              <Table.Td>{member.name}</Table.Td>

              <Table.Td className={member.balance < 0 ? "negative" : "positive"}>
                {formatMoney(member.balance)}
              </Table.Td>

              <Table.Td>
                <Badge color={getMemberStatus(member).color} variant="light">
                  {getMemberStatus(member).label}
                </Badge>
              </Table.Td>

              <Table.Td>
                <Button
                  className="member-edit-button"
                  variant="light"
                  size="xs"
                  onClick={() => onEditMember(member.id)}
                >
                  Edit
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}

export default MemberTable;
