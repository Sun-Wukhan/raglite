# Home Networking Notes

## Wi-Fi coverage and dead zones

Dead zones usually come from distance and building materials, not from a slow internet plan. A mesh system with two or three nodes fixes most coverage problems: place nodes halfway between the router and the dead spot, not inside the dead spot itself. Keep nodes in the open and off the floor. Wired backhaul between nodes, when you can run cable, is faster and more stable than wireless backhaul.

## Router and DNS settings

Change the default admin password on the router and turn on automatic firmware updates. For DNS, running a local resolver such as Pi-hole on the network filters ads and trackers for every device at once; point the router's DHCP settings at it so clients pick it up automatically. Reserve static DHCP leases for printers, servers, and anything other devices connect to by address.

## VLANs and guest networks

Put IoT gadgets — cameras, smart plugs, cheap bulbs — on a separate VLAN or guest network so a compromised device cannot reach your laptops and file shares. Most consumer mesh systems offer a guest network; prosumer routers can do full VLAN segmentation with firewall rules between segments. The guest network should have internet access only, with client isolation turned on.
