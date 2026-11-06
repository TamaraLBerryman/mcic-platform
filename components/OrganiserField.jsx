'use client';

import { useEffect, useState } from 'react';

export default function OrganiserField({ email, onChange, className }) {
    const [staff, setStaff] = useState([]);

    useEffect(() => {
        fetch('/api/staff')
            .then((response) => response.json())
            .then((data) => {
                if (data.success) setStaff(data.staff || []);
            })
            .catch(() => setStaff([]));
    }, []);

    const known = staff.some((person) => person.email === email);
    return (
        <select
            value={known ? email : ''}
            onChange={(event) => {
                const person = staff.find((member) => member.email === event.target.value) || null;
                onChange(person);
            }}
            className={className}
        >
            <option value="">Choose a Founders staff member</option>
            {staff.map((person) => (
                <option key={person.email} value={person.email}>{person.name}{person.role ? ` · ${person.role}` : ''}</option>
            ))}
        </select>
    );
}
