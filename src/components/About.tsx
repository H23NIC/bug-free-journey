import "./styles/About.css";

const About = () => {
  return (
    <div className="about-section" id="about">
      <div className="about-me">
        <h3
          className="title"
          style={{
            color: "#000000",
            WebkitTextFillColor: "#000000",
            fontWeight: 700,
          }}
        >
          About Me
        </h3>
        <p
          className="para"
          style={{
            color: "#111111",
            WebkitTextFillColor: "#111111",
            fontWeight: 600,
          }}
        >
          Network infrastructure expert, custom IoT builder, and full-stack web
          developer. I design, network, and deploy end-to-end technical
          solutions—from the microcontroller to the cloud.
        </p>
      </div>
    </div>
  );
};

export default About;
