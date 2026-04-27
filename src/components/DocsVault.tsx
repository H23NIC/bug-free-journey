import React, { useState, useEffect, useRef } from 'react';
import { HiX } from 'react-icons/hi';
import { gsap } from 'gsap';
import './DocsVault.css';

interface DocItem {
    id: number;
    title: string;
    category: string;
    content: string;
    preview: string;
    x: number;
    y: number;
}

const CATEGORIES = ["GitHub Cmds", "Windows Cmd", "Linux", "Kali Linux", "HackerOne", "Bug Bounty Tools"];

const DEMO_DATA: Partial<DocItem>[] = [
    { title: "Git Push/Pull", category: "GitHub Cmds", preview: "Basic git workflow for pushing and pulling changes...", content: "git add .\ngit commit -m 'message'\ngit push origin main" },
    { title: "IPConfig", category: "Windows Cmd", preview: "Check network settings and IP address...", content: "ipconfig /all\nipconfig /release\nipconfig /renew" },
    { title: "Sudo Apt Update", category: "Linux", preview: "Package management essentials for debian based systems...", content: "sudo apt update && sudo apt upgrade" },
    { title: "Metasploit Basics", category: "Kali Linux", preview: "Getting started with msfconsole...", content: "msfconsole\nuse exploit/multi/handler\nset payload linux/x86/meterpreter/reverse_tcp" },
    { title: "Reporting Bugs", category: "HackerOne", preview: "Best practices for writing bug reports...", content: "1. Summary\n2. Steps to reproduce\n3. Impact\n4. Recommended fix" },
    { title: "Sublist3r", category: "Bug Bounty Tools", preview: "Subdomain enumeration tool guide...", content: "python sublist3r.py -d example.com" },
    { title: "Branching", category: "GitHub Cmds", preview: "Creating and merging branches...", content: "git checkout -b feature\ngit branch\ngit merge main" },
    { title: "Dir Search", category: "Bug Bounty Tools", preview: "Web path discovery and brute forcing...", content: "dirsearch -u http://site.com -e php,html" }
];

const DocsVault: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [docs, setDocs] = useState<DocItem[]>([]);
    const [focusDoc, setFocusDoc] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Generate random positions
            const newDocs = DEMO_DATA.map((d, i) => ({
                ...d,
                id: i,
                x: Math.random() * (window.innerWidth - 300),
                y: Math.random() * (window.innerHeight - 200),
            } as DocItem));
            setDocs(newDocs);
        }
    }, [isOpen]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isOpen) return;

        let closestId = -1;
        let minDist = Infinity;

        docs.forEach(doc => {
            const dx = e.clientX - (doc.x + 140);
            const dy = e.clientY - (doc.y + 80);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist) {
                minDist = dist;
                closestId = doc.id;
            }
        });

        if (minDist < 300) {
            setFocusDoc(closestId);
        } else {
            setFocusDoc(null);
        }
    };

    useEffect(() => {
        if (focusDoc !== null) {
            const doc = docs.find(d => d.id === focusDoc);
            if (doc) {
                // Animate focused doc to center slightly and zoom
                gsap.to(`.card-${focusDoc}`, {
                    scale: 1.5,
                    duration: 0.5,
                    overwrite: true,
                    ease: "power2.out"
                });

                // Dim others
                docs.forEach(d => {
                    if (d.id !== focusDoc) {
                        gsap.to(`.card-${d.id}`, {
                            scale: 0.8,
                            opacity: 0.3,
                            duration: 0.5,
                            overwrite: true,
                            filter: "grayscale(1) brightness(0.5)"
                        });
                    }
                });
            }
        } else {
            // Reset all
            docs.forEach(d => {
                gsap.to(`.card-${d.id}`, {
                    scale: 1,
                    opacity: 1,
                    duration: 0.5,
                    overwrite: true,
                    filter: "grayscale(0) brightness(1)"
                });
            });
        }
    }, [focusDoc, docs]);

    return (
        <div className={`docs-vault-overlay ${isOpen ? 'active' : ''}`} onMouseMove={handleMouseMove}>
            <div className="docs-header">
                <h1>KNOWLEDGE VAULT</h1>
            </div>

            <div className="docs-close" onClick={onClose}><HiX /></div>

            <div className="docs-container" ref={containerRef}>
                {docs.map((doc) => (
                    <div 
                        key={doc.id}
                        className={`doc-card card-${doc.id} ${focusDoc === doc.id ? 'active-focus' : ''}`}
                        style={{ left: doc.x, top: doc.y }}
                    >
                        <span className="doc-category">{doc.category}</span>
                        <h3>{doc.title}</h3>
                        <p>{doc.preview}</p>
                    </div>
                ))}
            </div>
            
            {/* Background elements for elegance */}
            <div className="vault-bg-glow"></div>
        </div>
    );
};

export default DocsVault;
